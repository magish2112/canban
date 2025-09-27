class KanbanBoard {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('kanbanTasks')) || [];
        this.currentTaskId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupSearchAndFilters();
        this.setupThemeToggle();
        this.setupExportImport();
        this.setupArchive();
        this.renderTasks();
        this.updateTaskCounts();
        this.loadTheme();
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

    updateTaskCounts(filteredTasks = null) {
        const tasksToCount = filteredTasks || this.tasks;

        const counts = {
            todo: tasksToCount.filter(task => task.status === 'todo').length,
            'in-progress': tasksToCount.filter(task => task.status === 'in-progress').length,
            done: tasksToCount.filter(task => task.status === 'done').length
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

    // Поиск и фильтрация
    setupSearchAndFilters() {
        const searchInput = document.getElementById('searchInput');
        const statusFilter = document.getElementById('statusFilter');
        const priorityFilter = document.getElementById('priorityFilter');

        const updateFilters = () => {
            this.applyFilters();
        };

        searchInput.addEventListener('input', updateFilters);
        statusFilter.addEventListener('change', updateFilters);
        priorityFilter.addEventListener('change', updateFilters);
    }

    applyFilters() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const statusFilter = document.getElementById('statusFilter').value;
        const priorityFilter = document.getElementById('priorityFilter').value;

        let filteredTasks = this.tasks;

        // Применяем поиск
        if (searchTerm) {
            filteredTasks = filteredTasks.filter(task =>
                task.title.toLowerCase().includes(searchTerm) ||
                (task.description && task.description.toLowerCase().includes(searchTerm))
            );
        }

        // Применяем фильтр статуса
        if (statusFilter !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.status === statusFilter);
        }

        // Применяем фильтр приоритета
        if (priorityFilter !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.priority === priorityFilter);
        }

        this.renderFilteredTasks(filteredTasks);
        this.updateTaskCounts(filteredTasks);
    }

    renderFilteredTasks(filteredTasks) {
        // Очищаем все списки задач
        document.querySelectorAll('.task-list').forEach(list => {
            list.innerHTML = '';
        });

        // Группируем отфильтрованные задачи по статусу
        const tasksByStatus = {
            todo: filteredTasks.filter(task => task.status === 'todo'),
            'in-progress': filteredTasks.filter(task => task.status === 'in-progress'),
            done: filteredTasks.filter(task => task.status === 'done')
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

    // Темная тема
    setupThemeToggle() {
        const toggleBtn = document.getElementById('toggleThemeBtn');
        toggleBtn.addEventListener('click', () => this.toggleTheme());
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('kanbanTheme', newTheme);

        // Обновляем иконку кнопки
        const toggleBtn = document.getElementById('toggleThemeBtn');
        const icon = toggleBtn.querySelector('i');
        icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('kanbanTheme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);

        const toggleBtn = document.getElementById('toggleThemeBtn');
        const icon = toggleBtn.querySelector('i');
        icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    // Экспорт/импорт данных
    setupExportImport() {
        const exportBtn = document.getElementById('exportBtn');
        exportBtn.addEventListener('click', () => this.exportData());
    }

    exportData() {
        const data = {
            tasks: this.tasks,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `kanban-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert('Данные успешно экспортированы!');
    }

    // Архив задач
    setupArchive() {
        const archiveBtn = document.getElementById('archiveBtn');
        archiveBtn.addEventListener('click', () => this.showArchive());
    }

    showArchive() {
        // Получаем завершенные задачи
        const archivedTasks = this.tasks.filter(task => task.status === 'done');

        if (archivedTasks.length === 0) {
            alert('Нет завершенных задач для отображения в архиве.');
            return;
        }

        // Создаем модальное окно для архива
        const modal = document.createElement('div');
        modal.className = 'modal archive-modal';
        modal.innerHTML = `
            <div class="modal-content archive-content">
                <div class="modal-header">
                    <h2>Архив завершенных задач</h2>
                    <span class="close">&times;</span>
                </div>
                <div class="archive-list">
                    ${archivedTasks.map(task => `
                        <div class="archive-item">
                            <div class="archive-task-info">
                                <h3>${this.escapeHtml(task.title)}</h3>
                                ${task.description ? `<p>${this.escapeHtml(task.description)}</p>` : ''}
                                <small>Завершено: ${new Date(task.updatedAt).toLocaleDateString()}</small>
                            </div>
                            <div class="archive-actions">
                                <button class="btn btn-secondary restore-task" data-task-id="${task.id}">
                                    <i class="fas fa-undo"></i> Восстановить
                                </button>
                                <button class="btn btn-danger delete-task" data-task-id="${task.id}">
                                    <i class="fas fa-trash"></i> Удалить
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Обработчики событий
        modal.querySelector('.close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        // Обработчики для кнопок восстановления и удаления
        modal.querySelectorAll('.restore-task').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = e.target.closest('.restore-task').dataset.taskId;
                this.restoreTask(taskId);
                document.body.removeChild(modal);
            });
        });

        modal.querySelectorAll('.delete-task').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const taskId = e.target.closest('.delete-task').dataset.taskId;
                if (confirm('Удалить задачу навсегда? Это действие нельзя отменить.')) {
                    this.tasks = this.tasks.filter(task => task.id !== taskId);
                    this.saveToLocalStorage();
                    this.renderTasks();
                    this.updateTaskCounts();
                    document.body.removeChild(modal);
                }
            });
        });

        modal.style.display = 'block';
    }

    restoreTask(taskId) {
        const taskIndex = this.tasks.findIndex(task => task.id === taskId);
        if (taskIndex !== -1) {
            this.tasks[taskIndex].status = 'todo';
            this.tasks[taskIndex].updatedAt = new Date().toISOString();
            this.saveToLocalStorage();
            this.renderTasks();
            this.updateTaskCounts();
        }
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