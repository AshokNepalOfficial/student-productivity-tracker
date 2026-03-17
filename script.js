const { createApp } = Vue;

createApp({
  data() {
    return {
      newTask: "",
      tasks: []
    };
  },
  methods: {
    addTask() {
      if (this.newTask.trim() === "") return;

      this.tasks.push(this.newTask);
      this.newTask = "";
    },
    removeTask(index) {
      this.tasks.splice(index, 1);
    }
  }
}).mount("#app");