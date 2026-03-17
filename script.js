function addTask() {
  const input = document.getElementById("taskInput");
  const task = input.value;

  if (task === "") return;

  const li = document.createElement("li");
  li.className = "flex justify-between items-center bg-gray-100 p-2 rounded-lg";

  li.innerHTML = `
    <span>${task}</span>
    <button onclick="this.parentElement.remove()" 
      class="text-red-500 hover:text-red-700">
      Remove
    </button>
  `;

  document.getElementById("taskList").appendChild(li);

  input.value = "";
}