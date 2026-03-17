# Student Productivity Tracker

This is a daily evolving project where I build a productivity tracker.
## Key Features
**Design & Visual Identity:**
- Dark theme with vibrant cyan accent (`#00e5a0`) - modern and distinctive
- Space Grotesk display font with JetBrains Mono for numerical data
- Subtle background grid pattern with animated glow orbs for depth
- Priority-coded task borders (high=red, medium=amber, low=green)

**Core Functionality:**
- Full CRUD operations for tasks with localStorage persistence
- Category tagging (Study, Assignment, Exam, Project, Other)
- Priority levels with visual indicators
- Filter by All/Active/Completed
- Bulk clear completed tasks

**Focus Timer (Pomodoro):**
- 25-minute countdown with animated circular progress ring
- Play/pause/reset controls
- Visual glow animation when active

**Statistics Dashboard:**
- Daily completion progress with animated bar
- Active tasks counter
- Streak tracking across days
- Responsive - collapses on mobile with toggle

**Interactions & Polish:**
- Staggered fade-in animations for task lists
- Hover-reveal action buttons on tasks
- Modal for editing tasks with smooth scale-in animation
- Custom checkboxes with animated check marks
- Respects `prefers-reduced-motion` for accessibility

**Responsive Design:**
- Mobile-first layout that adapts from 375px to 1440px+
- Collapsible stats panel on mobile
- Touch-friendly tap targets
- Proper spacing and readability at all sizes

**Daily Routine System:**
- **Time-based scheduling** - Add routines with start/end times
- **Weekly planner** - Select which days each routine repeats (Su-Sa)
- **Category types** - Class, Study, Break, Exercise, Meal, Other (each with distinct color coding)
- **Location support** - Add room/location info for classes

**Live Schedule View:**
- **Current Activity Banner** - Shows what's happening right now with time remaining
- **Visual timeline** - See your full day at a glance
- **Live status indicators** - Completed items dim, current activity highlights with pulsing dot
- **Day selector** - Click any day to view that schedule

**Enhanced Dashboard:**
- **Dual progress bars** - Track both tasks AND routine completion
- **Live clock** - Real-time display in header
- **Smart activity badge** - Header shows current activity even when on other tabs

**Interactions:**
- Smooth tab switching between Schedule and Tasks
- Hover actions for quick edit/delete
- Modal for adding/editing routines with day picker
- All data persists in localStorage

**Responsive Design:**
- Works beautifully from mobile (375px) to desktop (1440px+)
- Collapsible sections on smaller screens
- Touch-friendly controls

**Multiple Timer Presets:**
- **Pomodoro (25 min)** - Classic focus session
- **Short Break (5 min)** - Quick rest between sessions
- **Long Break (15 min)** - Extended recovery time
- **Deep Work (50 min)** - Longer concentration blocks

**Custom Timer Management:**
- Click the **settings icon** (slider icon) on the timer card to open the management modal
- **Add Custom Timers** - Create your own with custom labels (1-180 minutes)
- **Delete Custom Timers** - Remove any user-created timer (default presets are protected)
- All presets saved to localStorage

**Smart Behavior:**
- Switching presets automatically resets the timer
- Active timer is highlighted in the modal
- Progress ring dynamically adjusts to selected duration
- State persists across page refreshes

**UI/UX:**
- Horizontal scrollable pill buttons for quick preset switching
- Clean modal interface for managing timers
- Visual feedback on active selection
- Timer label updates based on selected preset

**Routine Completion Tracking:** 
- Checkboxes for each routine instance (per day) that save to a log.

**Task Correlation:**
- Automatically detecting and displaying tasks completed during a specific routine's time window.

**Progress Report Modal:**
- A dedicated view showing weekly completion rates, most productive times, and task statistics.
