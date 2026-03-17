const { createApp, ref, computed, watch, onMounted } = Vue;

createApp({
    setup() {
    // Initialize reactive data first
    const tasks = ref([]);
    const newTask = ref({
        title: '',
        category: 'study',
        priority: 'medium'
    });
    const filter = ref('all');
    const showStats = ref(false);
    const showEditModal = ref(false);
    const editingTask = ref({});
    
    // Timer state
    const timerDuration = ref(25 * 60);
    const timerRemaining = ref(25 * 60);
    const timerRunning = ref(false);
    let timerInterval = null;
    
    // Load data from localStorage
    const loadFromStorage = () => {
        try {
        const savedTasks = localStorage.getItem('focusflow_tasks');
        const savedStreak = localStorage.getItem('focusflow_streak');
        const savedLastActive = localStorage.getItem('focusflow_lastActive');
        
        if (savedTasks) {
            tasks.value = JSON.parse(savedTasks);
        }
        
        if (savedStreak) {
            streak.value = parseInt(savedStreak);
        }
        
        if (savedLastActive) {
            lastActiveDate.value = savedLastActive;
        }
        } catch (e) {
        console.error('Failed to load from storage:', e);
        }
    };
    
    // Save to localStorage
    const saveToStorage = () => {
        try {
        localStorage.setItem('focusflow_tasks', JSON.stringify(tasks.value));
        localStorage.setItem('focusflow_streak', streak.value.toString());
        localStorage.setItem('focusflow_lastActive', lastActiveDate.value);
        } catch (e) {
        console.error('Failed to save to storage:', e);
        }
    };
    
    // Streak tracking
    const streak = ref(0);
    const lastActiveDate = ref('');
    
    const updateStreak = () => {
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        if (lastActiveDate.value === yesterday) {
        streak.value++;
        } else if (lastActiveDate.value !== today) {
        streak.value = 1;
        }
        
        lastActiveDate.value = today;
        saveToStorage();
    };
    
    // Computed properties
    const currentDate = computed(() => {
        return new Date().toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
        });
    });
    
    const currentDay = computed(() => {
        return new Date().toLocaleDateString('en-US', { weekday: 'long' });
    });
    
    const todayString = new Date().toDateString();
    
    const totalToday = computed(() => {
        return tasks.value.filter(t => new Date(t.createdAt).toDateString() === todayString).length;
    });
    
    const completedToday = computed(() => {
        return tasks.value.filter(t => 
        t.completed && new Date(t.completedAt).toDateString() === todayString
        ).length;
    });
    
    const progressPercent = computed(() => {
        if (totalToday.value === 0) return 0;
        return Math.round((completedToday.value / totalToday.value) * 100);
    });
    
    const activeTasks = computed(() => {
        return tasks.value.filter(t => !t.completed).length;
    });
    
    const completedCount = computed(() => {
        return tasks.value.filter(t => t.completed).length;
    });
    
    const filteredTasks = computed(() => {
        let result = [...tasks.value];
        
        if (filter.value === 'active') {
        result = result.filter(t => !t.completed);
        } else if (filter.value === 'completed') {
        result = result.filter(t => t.completed);
        }
        
        // Sort by priority and date
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        result.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
        });
        
        return result;
    });
    
    // Timer computed
    const timerDisplay = computed(() => {
        const mins = Math.floor(timerRemaining.value / 60);
        const secs = timerRemaining.value % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    });
    
    const timerProgress = computed(() => {
        const maxOffset = 440;
        const progress = timerRemaining.value / timerDuration.value;
        return maxOffset * (1 - progress);
    });
    
    const timerLabel = computed(() => {
        return timerRunning.value ? 'Focus Time' : 'Pomodoro';
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
    
    const editTask = (task) => {
        editingTask.value = { ...task };
        showEditModal.value = true;
    };
    
    const saveEdit = () => {
        const index = tasks.value.findIndex(t => t.id === editingTask.value.id);
        if (index !== -1) {
        tasks.value[index] = { ...editingTask.value };
        saveToStorage();
        }
        showEditModal.value = false;
    };
    
    const clearCompleted = () => {
        tasks.value = tasks.value.filter(t => !t.completed);
        saveToStorage();
    };
    
    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        return `${diffDays}d ago`;
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
            // Could add notification here
            }
        }, 1000);
        }
    };
    
    const resetTimer = () => {
        clearInterval(timerInterval);
        timerRunning.value = false;
        timerRemaining.value = timerDuration.value;
    };
    
    // Watch for changes
    watch(tasks, saveToStorage, { deep: true });
    
    // Initialize on mount
    onMounted(() => {
        loadFromStorage();
        
        // Check streak
        const today = new Date().toDateString();
        if (lastActiveDate.value !== today && tasks.value.some(t => !t.completed)) {
        updateStreak();
        }
    });
    
    return {
        tasks,
        newTask,
        filter,
        showStats,
        showEditModal,
        editingTask,
        timerDuration,
        timerRemaining,
        timerRunning,
        streak,
        currentDate,
        currentDay,
        totalToday,
        completedToday,
        progressPercent,
        activeTasks,
        completedCount,
        filteredTasks,
        timerDisplay,
        timerProgress,
        timerLabel,
        addTask,
        toggleTask,
        deleteTask,
        editTask,
        saveEdit,
        clearCompleted,
        formatTime,
        toggleTimer,
        resetTimer
    };
    }
}).mount('#app');