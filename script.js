class KanbanBoard {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('kanbanTasks')) || [];
        this.currentTaskId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderTasks();
        this.updateTaskCounts();
    }

    setupEventListeners() {
        // Кнопки добавления задач
        document.getElementById('addTaskBtn').addEventListener('click', () => this.openModal());
        document.querySelectorAll('.add-task-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const status = e.target.closest('.add-task-btn').dataset.column;
                this.openModal(status);
            });
        });

        // Модальное окно
        const modal = document.getElementById('taskModal');
        const closeBtn = document.querySelector('.close');
        const cancelBtn = document.getElementById('cancelBtn');
        const form = document.getElementById('taskForm');

        closeBtn.addEventListener('click', () => this.closeModal());
        cancelBtn.addEventListener('click', () => this.closeModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTask();
        });

        // Drag and drop
        this.setupDragAndDrop();
    }

    setupDragAndDrop() {
        const taskLists = document.querySelectorAll('.task-list');
        
        taskLists.forEach(list => {
            list.addEventListener('dragover', (e) => {
                e.preventDefault();
                list.classList.add('drag-over');
            });

            list.addEventListener('dragleave', (e) => {
                if (!list.contains(e.relatedTarget)) {
                    list.classList.remove('drag-over');
                }
            });

            list.addEventListener('drop', (e) => {
                e.preventDefault();
                list.classList.remove('drag-over');
                
                const taskId = e.dataTransfer.getData('text/plain');
                const newStatus = list.id;
                
                this.moveTask(taskId, newStatus);
            });
        });
    }

    openModal(status = 'todo') {
        const modal = document.getElementById('taskModal');
        const modalTitle = document.getElementById('modalTitle');
        const statusSelect = document.getElementById('taskStatus');
        const form = document.getElementById('taskForm');

        // Сброс формы
        form.reset();
        
        if (this.currentTaskId) {
            // Редактирование существующей задачи
            const task = this.tasks.find(t => t.id === this.currentTaskId);
            if (task) {
                modalTitle.textContent = 'Редактировать задачу';
                document.getElementById('taskTitle').value = task.title;
                document.getElementById('taskDescription').value = task.description || '';
                document.getElementById('taskPriority').value = task.priority;
                statusSelect.value = task.status;
            }
        } else {
            // Добавление новой задачи
            modalTitle.textContent = 'Добавить задачу';
            statusSelect.value = status;
        }

        modal.style.display = 'block';
        document.getElementById('taskTitle').focus();
    }

    closeModal() {
        const modal = document.getElementById('taskModal');
        modal.style.display = 'none';
        this.currentTaskId = null;
    }

    saveTask() {
        const title = document.getElementById('taskTitle').value.trim();
        const description = document.getElementById('taskDescription').value.trim();
        const priority = document.getElementById('taskPriority').value;
        const status = document.getElementById('taskStatus').value;

        if (!title) {
            alert('Пожалуйста, введите название задачи');
            return;
        }

        if (this.currentTaskId) {
            // Обновление существующей задачи
            const taskIndex = this.tasks.findIndex(t => t.id === this.currentTaskId);
            if (taskIndex !== -1) {
                this.tasks[taskIndex] = {
                    ...this.tasks[taskIndex],
                    title,
                    description,
                    priority,
                    status,
                    updatedAt: new Date().toISOString()
                };
            }
        } else {
            // Создание новой задачи
            const newTask = {
                id: this.generateId(),
                title,
                description,
                priority,
                status,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            this.tasks.push(newTask);
        }

        this.saveToLocalStorage();
        this.renderTasks();
        this.updateTaskCounts();
        this.closeModal();
    }

    deleteTask(taskId) {
        if (confirm('Вы уверены, что хотите удалить эту задачу?')) {
            this.tasks = this.tasks.filter(task => task.id !== taskId);
            this.saveToLocalStorage();
            this.renderTasks();
            this.updateTaskCounts();
        }
    }

    editTask(taskId) {
        this.currentTaskId = taskId;
        this.openModal();
    }

    moveTask(taskId, newStatus) {
        const taskIndex = this.tasks.findIndex(task => task.id === taskId);
        if (taskIndex !== -1) {
            this.tasks[taskIndex].status = newStatus;
            this.tasks[taskIndex].updatedAt = new Date().toISOString();
            this.saveToLocalStorage();
            this.renderTasks();
            this.updateTaskCounts();
        }
    }

    renderTasks() {
        // Очищаем все списки задач
        document.querySelectorAll('.task-list').forEach(list => {
            list.innerHTML = '';
        });

        // Группируем задачи по статусу
        const tasksByStatus = {
            todo: this.tasks.filter(task => task.status === 'todo'),
            'in-progress': this.tasks.filter(task => task.status === 'in-progress'),
            done: this.tasks.filter(task => task.status === 'done')
        };

        // Рендерим задачи в соответствующие колонки
        Object.keys(tasksByStatus).forEach(status => {
            const taskList = document.getElementById(status);
            const tasks = tasksByStatus[status];

            tasks.forEach(task => {
                const taskElement = this.createTaskElement(task);
                taskList.appendChild(taskElement);
            });
        });
    }

    createTaskElement(task) {
        const taskElement = document.createElement('div');
        taskElement.className = `task priority-${task.priority}`;
        taskElement.draggable = true;
        taskElement.dataset.taskId = task.id;

        const priorityLabels = {
            high: 'Высокий',
            medium: 'Средний',
            low: 'Низкий'
        };

        taskElement.innerHTML = `
            <div class="task-header">
                <div class="task-title">${this.escapeHtml(task.title)}</div>
                <div class="task-actions">
                    <button class="task-action-btn edit-task" title="Редактировать">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="task-action-btn delete-task" title="Удалить">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
            <div class="task-priority priority-${task.priority}">${priorityLabels[task.priority]}</div>
        `;

        // Добавляем обработчики событий
        taskElement.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', task.id);
            taskElement.classList.add('dragging');
        });

        taskElement.addEventListener('dragend', () => {
            taskElement.classList.remove('dragging');
        });

        // Обработчики для кнопок редактирования и удаления
        taskElement.querySelector('.edit-task').addEventListener('click', () => {
            this.editTask(task.id);
        });

        taskElement.querySelector('.delete-task').addEventListener('click', () => {
            this.deleteTask(task.id);
        });

        return taskElement;
    }

    updateTaskCounts() {
        const counts = {
            todo: this.tasks.filter(task => task.status === 'todo').length,
            'in-progress': this.tasks.filter(task => task.status === 'in-progress').length,
            done: this.tasks.filter(task => task.status === 'done').length
        };

        Object.keys(counts).forEach(status => {
            const column = document.querySelector(`[data-status="${status}"]`);
            const countElement = column.querySelector('.task-count');
            countElement.textContent = counts[status];
        });
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    saveToLocalStorage() {
        localStorage.setItem('kanbanTasks', JSON.stringify(this.tasks));
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new KanbanBoard();
});

// Добавляем несколько примеров задач при первом запуске
document.addEventListener('DOMContentLoaded', () => {
    const existingTasks = JSON.parse(localStorage.getItem('kanbanTasks')) || [];
    
    if (existingTasks.length === 0) {
        const sampleTasks = [
            {
                id: 'sample1',
                title: 'Изучить канбан методологию',
                description: 'Прочитать литературу по канбан и изучить основные принципы',
                priority: 'high',
                status: 'todo',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'sample2',
                title: 'Создать дизайн интерфейса',
                description: 'Разработать макеты для пользовательского интерфейса',
                priority: 'medium',
                status: 'in-progress',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'sample3',
                title: 'Настроить систему контроля версий',
                description: 'Инициализировать Git репозиторий и настроить workflow',
                priority: 'low',
                status: 'done',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
        
        localStorage.setItem('kanbanTasks', JSON.stringify(sampleTasks));
    }
}); 