
const { createApp, ref, computed, watch, onMounted, onUnmounted } = Vue;

createApp({
    setup() {
    // State
    const tasks = ref([]);
    const routines = ref([]);
    const routineCompletions = ref({}); // { routineId: { 'YYYY-MM-DD': true } }
    const timerPresets = ref([
        { id: 1, label: 'Pomodoro', minutes: 25, isDefault: true },
        { id: 2, label: 'Short Break', minutes: 5, isDefault: true },
        { id: 3, label: 'Long Break', minutes: 15, isDefault: true },
        { id: 4, label: 'Deep Work', minutes: 50, isDefault: true }
    ]);
    const activeTimerId = ref(1);
    const newTask = ref({ title: '', category: 'study', priority: 'medium' });
    const filter = ref('all');
    const activeTab = ref('schedule');
    const selectedDay = ref(new Date().getDay());
    
    // Modals
    const showRoutineModal = ref(false);
    const showTimerModal = ref(false);
    const showReportModal = ref(false);
    const showAddTimerForm = ref(false);
    
    const editingRoutine = ref({ title: '', startTime: '', endTime: '', type: 'class', location: '', days: [] });
    const newTimerPreset = ref({ label: '', minutes: 25 });
    const streak = ref(0);
    const lastActiveDate = ref('');
    
    // Timer
    const timerRunning = ref(false);
    const timerRemaining = ref(25 * 60);
    let timerInterval = null;
    
    // Clock
    const currentTime = ref('');
    let clockInterval = null;
    
    // Constants
    const weekDays = [
        { short: 'Su', full: 'Sunday' },
        { short: 'Mo', full: 'Monday' },
        { short: 'Tu', full: 'Tuesday' },
        { short: 'We', full: 'Wednesday' },
        { short: 'Th', full: 'Thursday' },
        { short: 'Fr', full: 'Friday' },
        { short: 'Sa', full: 'Saturday' }
    ];
    
    // Helpers
    const getTodayString = () => new Date().toISOString().split('T')[0];
    const getSelectedDateString = () => {
        const d = new Date();
        const currentDay = d.getDay();
        const diff = selectedDay.value - currentDay;
        d.setDate(d.getDate() + diff);
        return d.toISOString().split('T')[0];
    };

    // Storage
    const loadFromStorage = () => {
        try {
        const savedTasks = localStorage.getItem('focusflow_tasks');
        const savedRoutines = localStorage.getItem('focusflow_routines');
        const savedCompletions = localStorage.getItem('focusflow_completions');
        const savedPresets = localStorage.getItem('focusflow_timerPresets');
        const savedActiveTimer = localStorage.getItem('focusflow_activeTimer');
        const savedStreak = localStorage.getItem('focusflow_streak');
        const savedLastActive = localStorage.getItem('focusflow_lastActive');
        
        if (savedTasks) tasks.value = JSON.parse(savedTasks);
        if (savedRoutines) routines.value = JSON.parse(savedRoutines);
        if (savedCompletions) routineCompletions.value = JSON.parse(savedCompletions);
        if (savedPresets) timerPresets.value = JSON.parse(savedPresets);
        if (savedActiveTimer) activeTimerId.value = parseInt(savedActiveTimer);
        if (savedStreak) streak.value = parseInt(savedStreak);
        if (savedLastActive) lastActiveDate.value = savedLastActive;
        
        const activePreset = timerPresets.value.find(p => p.id === activeTimerId.value);
        if (activePreset) timerRemaining.value = activePreset.minutes * 60;
        } catch (e) {
        console.error('Storage load error:', e);
        }
    };
    
    const saveToStorage = () => {
        try {
        localStorage.setItem('focusflow_tasks', JSON.stringify(tasks.value));
        localStorage.setItem('focusflow_routines', JSON.stringify(routines.value));
        localStorage.setItem('focusflow_completions', JSON.stringify(routineCompletions.value));
        localStorage.setItem('focusflow_timerPresets', JSON.stringify(timerPresets.value));
        localStorage.setItem('focusflow_activeTimer', activeTimerId.value.toString());
        localStorage.setItem('focusflow_streak', streak.value.toString());
        localStorage.setItem('focusflow_lastActive', lastActiveDate.value);
        } catch (e) {
        console.error('Storage save error:', e);
        }
    };
    
    const updateClock = () => {
        const now = new Date();
        currentTime.value = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    };
    
    // Computed
    const currentDate = computed(() => new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
    const todayString = getTodayString();
    
    const totalToday = computed(() => tasks.value.filter(t => t.createdAt && t.createdAt.startsWith(todayString)).length);
    const completedToday = computed(() => tasks.value.filter(t => t.completed && t.completedAt && t.completedAt.startsWith(todayString)).length);
    const progressPercent = computed(() => totalToday.value === 0 ? 0 : Math.round((completedToday.value / totalToday.value) * 100));
    const activeTasks = computed(() => tasks.value.filter(t => !t.completed).length);
    
    const filteredTasks = computed(() => {
        let result = [...tasks.value];
        // Filter for today only in tasks view
        result = result.filter(t => t.createdAt && t.createdAt.startsWith(todayString));
        
        if (filter.value === 'active') result = result.filter(t => !t.completed);
        else if (filter.value === 'completed') result = result.filter(t => t.completed);
        
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return result.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    });
    
    const dayRoutines = computed(() => {
        return routines.value
        .filter(r => r.days && r.days.includes(selectedDay.value))
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    
    // Routine Completion Logic
    const isRoutineCompleted = (routineId) => {
        const dateStr = getSelectedDateString();
        return routineCompletions.value[routineId]?.[dateStr] || false;
    };

    const toggleRoutineCompletion = (routineId) => {
        const dateStr = getSelectedDateString();
        if (!routineCompletions.value[routineId]) {
        routineCompletions.value[routineId] = {};
        }
        routineCompletions.value[routineId][dateStr] = !routineCompletions.value[routineId][dateStr];
        saveToStorage();
    };

    const totalRoutine = computed(() => dayRoutines.value.length);
    const completedRoutineCount = computed(() => dayRoutines.value.filter(r => isRoutineCompleted(r.id)).length);
    const routineProgressPercent = computed(() => totalRoutine.value === 0 ? 0 : Math.round((completedRoutineCount.value / totalRoutine.value) * 100));

    // Task correlation with Routine
    const getTasksForRoutine = (routine) => {
        const dateStr = getSelectedDateString();
        const startDateTime = new Date(`${dateStr}T${routine.startTime}`);
        const endDateTime = new Date(`${dateStr}T${routine.endTime}`);
        
        return tasks.value.filter(t => {
        if (!t.completed || !t.completedAt) return false;
        const taskDate = t.completedAt.substring(0, 10);
        const taskTime = t.completedAt.substring(11, 16);
        if (taskDate !== dateStr) return false;
        
        const taskDateTime = new Date(`${dateStr}T${taskTime}`);
        return taskDateTime >= startDateTime && taskDateTime <= endDateTime;
        });
    };

    // Timer computed
    const activeTimerLabel = computed(() => {
        const preset = timerPresets.value.find(p => p.id === activeTimerId.value);
        return preset ? preset.label : 'Timer';
    });
    
    const timerDisplay = computed(() => {
        const mins = Math.floor(Math.max(0, timerRemaining.value) / 60);
        const secs = Math.max(0, timerRemaining.value) % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    });
    
    const timerProgress = computed(() => {
        const preset = timerPresets.value.find(p => p.id === activeTimerId.value);
        const totalSeconds = preset ? preset.minutes * 60 : 25 * 60;
        const maxOffset = 352;
        const progress = Math.max(0, timerRemaining.value) / Math.max(1, totalSeconds);
        return maxOffset * (1 - progress);
    });
    
    // Report Stats
    const reportStats = computed(() => {
        let routinesCompleted = 0;
        let totalRoutines = 0;
        
        // Calculate based on last 7 days
        for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayOfWeek = d.getDay();
        
        const dayRoutines = routines.value.filter(r => r.days && r.days.includes(dayOfWeek));
        totalRoutines += dayRoutines.length;
        
        dayRoutines.forEach(r => {
            if (routineCompletions.value[r.id]?.[dateStr]) {
            routinesCompleted++;
            }
        });
        }

        // Tasks completed in last 7 days
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const tasksCompleted = tasks.value.filter(t => t.completed && t.completedAt && new Date(t.completedAt) > weekAgo).length;

        // Completion rate
        const rate = totalRoutines > 0 ? Math.round((routinesCompleted / totalRoutines) * 100) : 0;

        // Most productive time (simple analysis)
        const hours = {};
        tasks.value.forEach(t => {
        if (t.completedAt) {
            const h = parseInt(t.completedAt.substring(11, 13));
            hours[h] = (hours[h] || 0) + 1;
        }
        });
        
        let maxHour = 0;
        let maxCount = 0;
        for (const [h, count] of Object.entries(hours)) {
        if (count > maxCount) {
            maxCount = count;
            maxHour = parseInt(h);
        }
        }
        
        const timeLabel = maxHour === 0 ? 'Not enough data' : `${maxHour}:00 - ${maxHour + 1}:00`;

        return {
        routinesCompleted,
        totalRoutines,
        tasksCompleted,
        completionRate: rate,
        mostProductiveTime: timeLabel
        };
    });

    const getDailyRoutinePercent = (dayIndex) => {
        // Look for the most recent occurrence of that day
        const d = new Date();
        // Find date of the most recent 'dayIndex'
        // Simple approach: just use current week's data
        const currentDay = d.getDay();
        const diff = dayIndex - currentDay;
        d.setDate(d.getDate() + diff);
        const dateStr = d.toISOString().split('T')[0];
        
        const dayRoutines = routines.value.filter(r => r.days && r.days.includes(dayIndex));
        if (dayRoutines.length === 0) return 0;
        
        const completedCount = dayRoutines.filter(r => routineCompletions.value[r.id]?.[dateStr]).length;
        return Math.round((completedCount / dayRoutines.length) * 100);
    };

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
    
    // Routine methods
    const openNewRoutineModal = () => {
        editingRoutine.value = { title: '', startTime: '', endTime: '', type: 'class', location: '', days: [] };
        showRoutineModal.value = true;
    };
    
    const toggleRoutineDay = (dayIndex) => {
        if (!editingRoutine.value.days) editingRoutine.value.days = [];
        const idx = editingRoutine.value.days.indexOf(dayIndex);
        if (idx === -1) editingRoutine.value.days.push(dayIndex);
        else editingRoutine.value.days.splice(idx, 1);
        editingRoutine.value = { ...editingRoutine.value };
    };
    
    const saveRoutine = () => {
        if (!editingRoutine.value.title || !editingRoutine.value.startTime || !editingRoutine.value.endTime) return;
        if (!editingRoutine.value.days) editingRoutine.value.days = [];
        
        if (editingRoutine.value.id) {
        const idx = routines.value.findIndex(r => r.id === editingRoutine.value.id);
        if (idx !== -1) routines.value[idx] = { ...editingRoutine.value, days: [...editingRoutine.value.days] };
        } else {
        routines.value.push({ ...editingRoutine.value, id: Date.now(), days: [...editingRoutine.value.days] });
        }
        
        showRoutineModal.value = false;
        editingRoutine.value = { title: '', startTime: '', endTime: '', type: 'class', location: '', days: [] };
        saveToStorage();
    };
    
    const editRoutine = (routine) => {
        editingRoutine.value = { ...routine, days: routine.days ? [...routine.days] : [] };
        showRoutineModal.value = true;
    };
    
    const deleteRoutine = (id) => {
        routines.value = routines.value.filter(r => r.id !== id);
        saveToStorage();
    };
    
    const calculateDuration = (start, end) => {
        const s = start.split(':').map(Number);
        const e = end.split(':').map(Number);
        const diff = (e[0] * 60 + e[1]) - (s[0] * 60 + s[1]);
        if (diff < 60) return `${diff}m`;
        return `${Math.floor(diff / 60)}h ${diff % 60}m`;
    };
    
    // Timer methods
    const selectTimerPreset = (preset) => {
        if (timerRunning.value) {
        clearInterval(timerInterval);
        timerRunning.value = false;
        }
        activeTimerId.value = preset.id;
        timerRemaining.value = preset.minutes * 60;
        saveToStorage();
    };
    
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
            const preset = timerPresets.value.find(p => p.id === activeTimerId.value);
            if (preset) timerRemaining.value = preset.minutes * 60;
            }
        }, 1000);
        }
    };
    
    const resetTimer = () => {
        clearInterval(timerInterval);
        timerRunning.value = false;
        const preset = timerPresets.value.find(p => p.id === activeTimerId.value);
        if (preset) timerRemaining.value = preset.minutes * 60;
    };
    
    const addTimerPreset = () => {
        if (!newTimerPreset.value.label || !newTimerPreset.value.minutes) return;
        timerPresets.value.push({
        id: Date.now(),
        label: newTimerPreset.value.label,
        minutes: Math.min(180, Math.max(1, newTimerPreset.value.minutes)),
        isDefault: false
        });
        newTimerPreset.value = { label: '', minutes: 25 };
        showAddTimerForm.value = false;
        saveToStorage();
    };
    
    const deleteTimerPreset = (id) => {
        if (activeTimerId.value === id) return;
        timerPresets.value = timerPresets.value.filter(p => p.id !== id);
        saveToStorage();
    };
    
    // Watch
    watch([tasks, routines, routineCompletions], saveToStorage, { deep: true });
    
    // Lifecycle
    onMounted(() => {
        loadFromStorage();
        updateClock();
        clockInterval = setInterval(updateClock, 1000);
    });
    
    onUnmounted(() => {
        clearInterval(clockInterval);
        clearInterval(timerInterval);
    });
    
    return {
        tasks, routines, timerPresets, activeTimerId, newTask, filter, activeTab, selectedDay,
        showRoutineModal, showTimerModal, showReportModal, showAddTimerForm, editingRoutine, newTimerPreset,
        streak, currentTime, weekDays, timerRunning, timerRemaining,
        currentDate, totalToday, completedToday, progressPercent, activeTasks,
        filteredTasks, dayRoutines, totalRoutine, completedRoutineCount, routineProgressPercent,
        timerDisplay, timerProgress, activeTimerLabel, reportStats, getDailyRoutinePercent,
        addTask, toggleTask, deleteTask,
        openNewRoutineModal, toggleRoutineDay, saveRoutine, editRoutine, deleteRoutine,
        isRoutineCompleted, toggleRoutineCompletion, getTasksForRoutine, calculateDuration,
        selectTimerPreset, toggleTimer, resetTimer, addTimerPreset, deleteTimerPreset
    };
    }
}).mount('#app');
