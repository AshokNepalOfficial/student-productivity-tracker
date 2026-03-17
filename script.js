const { createApp, ref, computed, watch, onMounted, onUnmounted } = Vue;

createApp({
    setup() {
    // State
    const tasks = ref([]);
    const routines = ref([]);
    const newTask = ref({ title: '', category: 'study', priority: 'medium' });
    const filter = ref('all');
    const activeTab = ref('schedule');
    const selectedDay = ref(new Date().getDay());
    const showRoutineModal = ref(false);
    const editingRoutine = ref({ days: [] });
    const streak = ref(0);
    const lastActiveDate = ref('');
    
    // Timer
    const timerDuration = ref(25 * 60);
    const timerRemaining = ref(25 * 60);
    const timerRunning = ref(false);
    let timerInterval = null;
    
    // Clock
    const currentTime = ref('');
    const currentMinute = ref(0);
    let clockInterval = null;
    
    // Week days
    const weekDays = [
        { short: 'Su', full: 'Sunday' },
        { short: 'Mo', full: 'Monday' },
        { short: 'Tu', full: 'Tuesday' },
        { short: 'We', full: 'Wednesday' },
        { short: 'Th', full: 'Thursday' },
        { short: 'Fr', full: 'Friday' },
        { short: 'Sa', full: 'Saturday' }
    ];
    
    // Load from localStorage
    const loadFromStorage = () => {
        try {
        const savedTasks = localStorage.getItem('focusflow_tasks');
        const savedRoutines = localStorage.getItem('focusflow_routines');
        const savedStreak = localStorage.getItem('focusflow_streak');
        const savedLastActive = localStorage.getItem('focusflow_lastActive');
        
        if (savedTasks) tasks.value = JSON.parse(savedTasks);
        if (savedRoutines) routines.value = JSON.parse(savedRoutines);
        if (savedStreak) streak.value = parseInt(savedStreak);
        if (savedLastActive) lastActiveDate.value = savedLastActive;
        } catch (e) {
        console.error('Storage load error:', e);
        }
    };
    
    // Save to localStorage
    const saveToStorage = () => {
        try {
        localStorage.setItem('focusflow_tasks', JSON.stringify(tasks.value));
        localStorage.setItem('focusflow_routines', JSON.stringify(routines.value));
        localStorage.setItem('focusflow_streak', streak.value.toString());
        localStorage.setItem('focusflow_lastActive', lastActiveDate.value);
        } catch (e) {
        console.error('Storage save error:', e);
        }
    };
    
    // Update clock
    const updateClock = () => {
        const now = new Date();
        currentTime.value = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        currentMinute.value = now.getHours() * 60 + now.getMinutes();
    };
    
    // Computed
    const currentDate = computed(() => {
        return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    });
    
    const currentDayIndex = computed(() => new Date().getDay());
    
    const todayString = new Date().toDateString();
    
    const totalToday = computed(() => tasks.value.filter(t => new Date(t.createdAt).toDateString() === todayString).length);
    
    const completedToday = computed(() => tasks.value.filter(t => t.completed && t.completedAt && new Date(t.completedAt).toDateString() === todayString).length);
    
    const progressPercent = computed(() => totalToday.value === 0 ? 0 : Math.round((completedToday.value / totalToday.value) * 100));
    
    const activeTasks = computed(() => tasks.value.filter(t => !t.completed).length);
    
    const completedCount = computed(() => tasks.value.filter(t => t.completed).length);
    
    const filteredTasks = computed(() => {
        let result = [...tasks.value];
        if (filter.value === 'active') result = result.filter(t => !t.completed);
        else if (filter.value === 'completed') result = result.filter(t => t.completed);
        
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return result.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    });
    
    // Routines computed
    const dayRoutines = computed(() => {
        return routines.value
        .filter(r => r.days.includes(selectedDay.value))
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    
    const currentActivity = computed(() => {
        if (routines.value.length === 0) return null;
        const today = new Date().getDay();
        const now = currentTime.value;
        
        return routines.value.find(r => {
        if (!r.days.includes(today)) return false;
        return now >= r.startTime && now <= r.endTime;
        });
    });
    
    const timeRemaining = computed(() => {
        if (!currentActivity.value) return '';
        const end = currentActivity.value.endTime.split(':');
        const now = new Date();
        const endMins = parseInt(end[0]) * 60 + parseInt(end[1]);
        const nowMins = now.getHours() * 60 + now.getMinutes();
        const diff = endMins - nowMins;
        if (diff <= 0) return '0 min';
        if (diff < 60) return `${diff} min`;
        return `${Math.floor(diff / 60)}h ${diff % 60}m`;
    });
    
    const totalRoutine = computed(() => dayRoutines.value.length);
    
    const completedRoutine = computed(() => {
        const now = new Date();
        const nowMins = now.getHours() * 60 + now.getMinutes();
        return dayRoutines.value.filter(r => {
        const end = r.endTime.split(':');
        return parseInt(end[0]) * 60 + parseInt(end[1]) < nowMins;
        }).length;
    });
    
    const routineProgress = computed(() => totalRoutine.value === 0 ? 0 : Math.round((completedRoutine.value / totalRoutine.value) * 100));
    
    // Timer computed
    const timerDisplay = computed(() => {
        const mins = Math.floor(Math.max(0, timerRemaining.value) / 60);
        const secs = Math.max(0, timerRemaining.value) % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    });
    
    const timerProgress = computed(() => {
        const maxOffset = 352;
        const progress = Math.max(0, timerRemaining.value) / Math.max(1, timerDuration.value);
        return maxOffset * (1 - progress);
    });
    
    // Methods
    const addTask = () => {
        if (!newTask.value.title.trim()) return;
        tasks.value.unshift({
        id: Date.now(),
        title: newTask.value.title.trim(),
        category: newTask.value.category,
        priority: newTask.value.priority,
        completed: false,
        createdAt: new Date().toISOString(),
        completedAt: null
        });
        newTask.value.title = '';
        updateStreak();
        saveToStorage();
    };
    
    const toggleTask = (id) => {
        const task = tasks.value.find(t => t.id === id);
        if (task) {
        task.completed = !task.completed;
        task.completedAt = task.completed ? new Date().toISOString() : null;
        saveToStorage();
        }
    };
    
    const deleteTask = (id) => {
        tasks.value = tasks.value.filter(t => t.id !== id);
        saveToStorage();
    };
    
    const clearCompleted = () => {
        tasks.value = tasks.value.filter(t => !t.completed);
        saveToStorage();
    };
    
    const updateStreak = () => {
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        if (lastActiveDate.value === yesterday) streak.value++;
        else if (lastActiveDate.value !== today) streak.value = 1;
        
        lastActiveDate.value = today;
        saveToStorage();
    };
    
    // Routine methods
    const toggleRoutineDay = (dayIndex) => {
        const idx = editingRoutine.value.days.indexOf(dayIndex);
        if (idx === -1) {
        editingRoutine.value.days.push(dayIndex);
        } else {
        editingRoutine.value.days.splice(idx, 1);
        }
    };
    
    const saveRoutine = () => {
        if (!editingRoutine.value.title || !editingRoutine.value.startTime || !editingRoutine.value.endTime) return;
        
        if (editingRoutine.value.id) {
        const idx = routines.value.findIndex(r => r.id === editingRoutine.value.id);
        if (idx !== -1) routines.value[idx] = { ...editingRoutine.value };
        } else {
        routines.value.push({
            ...editingRoutine.value,
            id: Date.now()
        });
        }
        
        closeRoutineModal();
        saveToStorage();
    };
    
    const editRoutine = (routine) => {
        editingRoutine.value = { ...routine, days: [...routine.days] };
        showRoutineModal.value = true;
    };
    
    const deleteRoutine = (id) => {
        routines.value = routines.value.filter(r => r.id !== id);
        saveToStorage();
    };
    
    const closeRoutineModal = () => {
        showRoutineModal.value = false;
        editingRoutine.value = { days: [] };
    };
    
    const isRoutineCurrent = (routine) => {
        if (selectedDay.value !== currentDayIndex.value) return false;
        const now = currentTime.value;
        return now >= routine.startTime && now <= routine.endTime;
    };
    
    const isRoutineCompleted = (routine) => {
        if (selectedDay.value !== currentDayIndex.value) return false;
        const now = currentTime.value;
        return now > routine.endTime;
    };
    
    const calculateDuration = (start, end) => {
        const s = start.split(':').map(Number);
        const e = end.split(':').map(Number);
        const diff = (e[0] * 60 + e[1]) - (s[0] * 60 + s[1]);
        if (diff < 60) return `${diff} min`;
        return `${Math.floor(diff / 60)}h ${diff % 60}m`;
    };
    
    // Timer methods
    const toggleTimer = () => {
        if (timerRunning.value) {
        clearInterval(timerInterval);
        timerRunning.value = false;
        } else {
        timerRunning.value = true;
        timerInterval = setInterval(() => {
            if (timerRemaining.value > 0) {
            timerRemaining.value--;
            } else {
            clearInterval(timerInterval);
            timerRunning.value = false;
            timerRemaining.value = timerDuration.value;
            }
        }, 1000);
        }
    };
    
    const resetTimer = () => {
        clearInterval(timerInterval);
        timerRunning.value = false;
        timerRemaining.value = timerDuration.value;
    };
    
    // Watch
    watch([tasks, routines], saveToStorage, { deep: true });
    
    // Lifecycle
    onMounted(() => {
        loadFromStorage();
        updateClock();
        clockInterval = setInterval(updateClock, 1000);
        
        const today = new Date().toDateString();
        if (lastActiveDate.value !== today) {
        updateStreak();
        }
    });
    
    onUnmounted(() => {
        clearInterval(clockInterval);
        clearInterval(timerInterval);
    });
    
    return {
        tasks, routines, newTask, filter, activeTab, selectedDay, showRoutineModal, editingRoutine,
        streak, currentTime, currentMinute, weekDays, timerDuration, timerRemaining, timerRunning,
        currentDate, currentDayIndex, totalToday, completedToday, progressPercent, activeTasks,
        completedCount, filteredTasks, dayRoutines, currentActivity, timeRemaining, totalRoutine,
        completedRoutine, routineProgress, timerDisplay, timerProgress,
        addTask, toggleTask, deleteTask, clearCompleted,
        toggleRoutineDay, saveRoutine, editRoutine, deleteRoutine, closeRoutineModal,
        isRoutineCurrent, isRoutineCompleted, calculateDuration,
        toggleTimer, resetTimer
    };
    }
}).mount('#app');