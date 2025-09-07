/**
 * Enhanced App Manager with Template Filtering and GitHub Repository Comparison
 * Handles template filtering, GitHub repository status checking, and action buttons
 */

class AppManager {
    constructor() {
        this.templates = [];
        this.githubRepositories = [];
        this.filteredTemplates = [];
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.isLoading = false;
        this.githubIntegration = null;
        this.codemagicIntegration = null;
        this.configManager = null;
        this.authManager = null;
        this.templateActions = null;

        this.init();
    }

    // Initialize the app manager
    init() {
        this.setupEventListeners();
        // Templates will be loaded after managers are set
    }

    // Set configuration manager
    setConfigManager(configManager) {
        this.configManager = configManager;

        // Listen for configuration changes
        this.configManager.on('config:loaded', () => {
            this.loadTemplates();
        });
    }

    // Set authentication manager
    setAuthManager(authManager) {
        this.authManager = authManager;

        // Listen for authentication changes
        this.authManager.on('github:authenticated', async (data) => {
            console.log('🔄 GitHub authenticated, refreshing repository data...');
            await this.loadGitHubRepositories();
            await this.compareTemplatesWithRepositories();
            this.renderTemplates();
            this.showSuccess(`GitHub connected as ${data.user.login} - Template list updated`);
        });

        this.authManager.on('github:error', () => {
            console.log('❌ GitHub authentication failed, clearing repository data...');
            this.githubRepositories = [];
            this.clearRepositoryStatus();
            this.renderTemplates();
        });
    }

    // Set template action manager
    setTemplateActions(templateActions) {
        this.templateActions = templateActions;

        // Listen for template updates
        this.templateActions.on('template:updated', (data) => {
            this.updateTemplate(data.templateId, data.template);
        });
    }

    // Setup event listeners
    setupEventListeners() {
        // Filter controls
        const filterSelect = document.getElementById('templateFilter');
        const searchInput = document.getElementById('templateSearch');
        
        if (filterSelect) {
            filterSelect.addEventListener('change', () => this.applyFilters());
        }
        
        if (searchInput) {
            searchInput.addEventListener('input', () => this.applyFilters());
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshTemplatesBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshTemplates());
        }
    }

    // Set GitHub integration instance
    setGitHubIntegration(githubIntegration) {
        this.githubIntegration = githubIntegration;
    }

    // Set Codemagic integration instance
    setCodemagicIntegration(codemagicIntegration) {
        this.codemagicIntegration = codemagicIntegration;
    }

    // Load templates from template manager
    async loadTemplates() {
        try {
            this.isLoading = true;
            this.updateLoadingState(true);

            console.log('🔄 Loading templates...');

            // Get templates from template manager
            if (window.templatesManager) {
                this.templates = window.templatesManager.getAllTemplates();
                console.log(`📱 Found ${this.templates.length} templates`);
            } else {
                console.warn('Templates manager not available');
                this.templates = [];
            }

            // Load GitHub repositories if authenticated
            await this.loadGitHubRepositories();

            // Compare templates with GitHub repositories
            await this.compareTemplatesWithRepositories();

            // Apply filters and render
            this.applyFilters();

            // Initialize selected template states
            this.initializeSelectedTemplates();

            console.log('✅ Templates loaded and processed successfully');

        } catch (error) {
            console.error('❌ Failed to load templates:', error);
            this.showError('Failed to load templates: ' + error.message);

            // Show empty state with error
            this.renderEmptyStateWithError(error.message);
        } finally {
            this.isLoading = false;
            this.updateLoadingState(false);
        }
    }

    // Initialize selected template states on startup
    initializeSelectedTemplates() {
        const config = this.configManager?.getConfig();
        const selectedTemplates = config?.ui?.selectedTemplates || [];

        if (selectedTemplates.length > 0) {
            console.log(`🎯 Initializing ${selectedTemplates.length} selected templates:`, selectedTemplates);
            this.updateSelectedTemplatesCounter(selectedTemplates);

            // Update preview section if template actions are available
            if (this.templateActions) {
                this.templateActions.updatePreviewSection(selectedTemplates);
            }
        }
    }

    // Load GitHub repositories with enhanced error handling and rate limiting
    async loadGitHubRepositories() {
        // Check authentication status through auth manager
        const authStatus = this.authManager?.getAuthStatus('github');
        if (!authStatus || !authStatus.isAuthenticated) {
            console.log('GitHub not authenticated, clearing repository data');
            this.githubRepositories = [];
            return;
        }

        try {
            console.log('🔄 Loading GitHub repositories...');

            // Get GitHub token from configuration
            const config = this.configManager?.getConfig();
            const githubToken = config?.authentication?.github?.token;

            if (!githubToken) {
                throw new Error('GitHub token not found in configuration');
            }

            // Fetch repositories directly using GitHub API
            const repositories = await this.fetchGitHubRepositories(githubToken);

            this.githubRepositories = repositories || [];

            console.log(`✅ Loaded ${this.githubRepositories.length} GitHub repositories`);

            if (this.githubRepositories.length === 0) {
                this.showInfo('No GitHub repositories found');
            } else {
                console.log(`📊 Repository summary:`, {
                    total: this.githubRepositories.length,
                    private: this.githubRepositories.filter(r => r.private).length,
                    public: this.githubRepositories.filter(r => !r.private).length
                });
            }

        } catch (error) {
            console.error('❌ Failed to load GitHub repositories:', error);
            this.githubRepositories = [];

            // Handle specific error types
            if (error.message.includes('rate limit')) {
                this.showError('GitHub API rate limit exceeded. Please try again later.');
            } else if (error.message.includes('401') || error.message.includes('authentication')) {
                this.showError('GitHub authentication failed. Please check your token.');
            } else if (error.message.includes('403')) {
                this.showError('GitHub access forbidden. Please check your token permissions.');
            } else {
                this.showError(`Failed to load GitHub repositories: ${error.message}`);
            }
        }
    }

    // Fetch GitHub repositories using direct API call
    async fetchGitHubRepositories(token) {
        const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated&direction=desc', {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Cordova-App-Generator/1.0'
            }
        });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }

        const repositories = await response.json();

        // Transform repository data for our use
        return repositories.map(repo => ({
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description,
            private: repo.private,
            html_url: repo.html_url,
            clone_url: repo.clone_url,
            ssh_url: repo.ssh_url,
            updated_at: repo.updated_at,
            created_at: repo.created_at,
            language: repo.language,
            stargazers_count: repo.stargazers_count,
            forks_count: repo.forks_count,
            size: repo.size,
            default_branch: repo.default_branch,
            topics: repo.topics || [],
            archived: repo.archived,
            disabled: repo.disabled
        }));
    }

    // Compare templates with GitHub repositories using intelligent name matching
    async compareTemplatesWithRepositories() {
        console.log('🔍 Comparing templates with GitHub repositories...');

        let matchedCount = 0;
        let totalTemplates = this.templates.length;

        this.templates = this.templates.map(template => {
            // Generate multiple name variations for matching
            const templateNames = this.generateNameVariations(template.name);
            const appNames = template.appName ? this.generateNameVariations(template.appName) : [];
            const displayNames = template.displayName ? this.generateNameVariations(template.displayName) : [];

            // Combine all possible names
            const allPossibleNames = [...templateNames, ...appNames, ...displayNames];

            console.log(`🔍 Matching template "${template.name}" with variations:`, allPossibleNames);

            // Find matching repository by trying all name variations
            const matchingRepo = this.githubRepositories.find(repo => {
                const repoNames = this.generateNameVariations(repo.name);

                // Check if any template name variation matches any repo name variation
                const isMatch = allPossibleNames.some(templateName =>
                    repoNames.some(repoName =>
                        templateName.toLowerCase() === repoName.toLowerCase()
                    )
                );

                if (isMatch) {
                    console.log(`✅ Found match: "${template.name}" → "${repo.name}"`);
                }

                return isMatch;
            });

            if (matchingRepo) {
                matchedCount++;
            }

            // Determine repository status
            const repoStatus = this.determineRepositoryStatus(matchingRepo);

            return {
                ...template,
                hasGitHubRepo: !!matchingRepo,
                githubRepo: matchingRepo || null,
                repoStatus: repoStatus,
                // Add matching info for debugging
                nameVariations: allPossibleNames,
                matchedRepoName: matchingRepo?.name || null
            };
        });

        console.log(`📊 Repository matching complete: ${matchedCount}/${totalTemplates} templates matched`);

        // Update UI with matching results
        if (matchedCount > 0) {
            this.showSuccess(`Found ${matchedCount} matching repositories out of ${totalTemplates} templates`);
        } else if (this.githubRepositories.length > 0) {
            this.showInfo(`No matching repositories found. Check template names or create repositories.`);
        }
    }

    // Determine repository status with detailed information
    determineRepositoryStatus(repo) {
        if (!repo) {
            return {
                status: 'not_found',
                statusText: 'No Repository',
                statusIcon: '❌',
                statusClass: 'status-not-found'
            };
        }

        // Check for access issues
        if (repo.archived) {
            return {
                status: 'archived',
                statusText: 'Archived',
                statusIcon: '📦',
                statusClass: 'status-archived',
                isPrivate: repo.private,
                url: repo.html_url,
                cloneUrl: repo.clone_url,
                sshUrl: repo.ssh_url,
                updatedAt: repo.updated_at,
                createdAt: repo.created_at,
                stars: repo.stargazers_count,
                forks: repo.forks_count,
                language: repo.language,
                size: repo.size,
                topics: repo.topics,
                defaultBranch: repo.default_branch
            };
        }

        if (repo.disabled) {
            return {
                status: 'disabled',
                statusText: 'Disabled',
                statusIcon: '⚠️',
                statusClass: 'status-disabled',
                isPrivate: repo.private,
                url: repo.html_url,
                cloneUrl: repo.clone_url,
                sshUrl: repo.ssh_url,
                updatedAt: repo.updated_at,
                createdAt: repo.created_at,
                stars: repo.stargazers_count,
                forks: repo.forks_count,
                language: repo.language,
                size: repo.size,
                topics: repo.topics,
                defaultBranch: repo.default_branch
            };
        }

        // Repository is accessible
        const status = repo.private ? 'private' : 'public';
        return {
            status: status,
            statusText: repo.private ? 'Private Repository' : 'Public Repository',
            statusIcon: repo.private ? '🔒' : '✅',
            statusClass: repo.private ? 'status-private' : 'status-public',
            isPrivate: repo.private,
            url: repo.html_url,
            cloneUrl: repo.clone_url,
            sshUrl: repo.ssh_url,
            updatedAt: repo.updated_at,
            createdAt: repo.created_at,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            language: repo.language,
            size: repo.size,
            topics: repo.topics,
            defaultBranch: repo.default_branch,
            description: repo.description
        };
    }

    // Generate name variations for intelligent matching
    generateNameVariations(name) {
        if (!name || typeof name !== 'string') return [];

        const variations = [];
        const cleanName = name.trim();

        // Original name
        variations.push(cleanName);

        // Lowercase
        variations.push(cleanName.toLowerCase());

        // Remove spaces
        variations.push(cleanName.replace(/\s+/g, ''));

        // CamelCase (remove spaces and capitalize first letter of each word)
        const camelCase = cleanName.replace(/\s+(.)/g, (_, letter) => letter.toUpperCase());
        variations.push(camelCase);

        // PascalCase (CamelCase with first letter capitalized)
        const pascalCase = camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
        variations.push(pascalCase);

        // kebab-case (lowercase with hyphens)
        variations.push(cleanName.toLowerCase().replace(/\s+/g, '-'));

        // snake_case (lowercase with underscores)
        variations.push(cleanName.toLowerCase().replace(/\s+/g, '_'));

        // Remove special characters
        const alphanumeric = cleanName.replace(/[^a-zA-Z0-9\s]/g, '');
        if (alphanumeric !== cleanName) {
            variations.push(alphanumeric);
            variations.push(alphanumeric.replace(/\s+/g, ''));
        }

        // Remove common words
        const withoutCommonWords = cleanName.replace(/\b(app|mobile|cordova|phonegap|the|a|an)\b/gi, '').trim();
        if (withoutCommonWords && withoutCommonWords !== cleanName) {
            variations.push(withoutCommonWords);
            variations.push(withoutCommonWords.replace(/\s+/g, ''));
        }

        // Remove duplicates and empty strings
        return [...new Set(variations)].filter(v => v && v.length > 0);
    }

    // Clear repository status from all templates
    clearRepositoryStatus() {
        console.log('🧹 Clearing repository status from templates...');

        this.templates = this.templates.map(template => ({
            ...template,
            hasGitHubRepo: false,
            githubRepo: null,
            repoStatus: {
                status: 'not_found',
                statusText: 'No Repository',
                statusIcon: '❌',
                statusClass: 'status-not-found'
            },
            nameVariations: undefined,
            matchedRepoName: null
        }));

        console.log('✅ Repository status cleared from all templates');
    }

    // Update selected template states in UI
    updateSelectedTemplateStates() {
        const config = this.configManager?.getConfig();
        const selectedTemplates = config?.ui?.selectedTemplates || [];

        if (selectedTemplates.length === 0) return;

        console.log('🔄 Updating selected template states:', selectedTemplates);

        selectedTemplates.forEach(templateId => {
            const templateCard = document.querySelector(`[data-template-id="${templateId}"]`);
            if (!templateCard) return;

            const selectButton = templateCard.querySelector('button[onclick*="selectTemplate"]');
            if (!selectButton) return;

            // Update button state to show as selected
            selectButton.classList.remove('btn-outline');
            selectButton.classList.add('btn-success');
            selectButton.innerHTML = '<i class="fas fa-check"></i> Selected';
            selectButton.title = 'Remove from generation queue';
            templateCard.classList.add('template-selected');
        });

        // Update UI counters
        this.updateSelectedTemplatesCounter(selectedTemplates);
    }

    // Update selected templates counter in header
    updateSelectedTemplatesCounter(selectedTemplates) {
        // Update header counter if it exists
        const counterElement = document.getElementById('selectedTemplatesCount');
        if (counterElement) {
            counterElement.textContent = selectedTemplates.length;
            counterElement.style.display = selectedTemplates.length > 0 ? 'inline' : 'none';
        }

        // Update generate all button state
        const generateAllBtn = document.getElementById('generateAllBtn');
        if (generateAllBtn) {
            if (selectedTemplates.length > 0) {
                generateAllBtn.disabled = false;
                generateAllBtn.innerHTML = `<i class="fas fa-rocket"></i> Generate ${selectedTemplates.length} Apps`;
                generateAllBtn.title = `Generate ${selectedTemplates.length} selected templates`;
            } else {
                generateAllBtn.disabled = true;
                generateAllBtn.innerHTML = '<i class="fas fa-rocket"></i> Generate All Apps';
                generateAllBtn.title = 'Select templates to generate';
            }
        }
    }

    // Refresh template list with current repository status
    async refreshTemplates() {
        console.log('🔄 Refreshing template list...');

        try {
            this.isLoading = true;
            this.updateLoadingState(true);

            // Reload templates
            await this.loadTemplates();

            console.log('✅ Template list refreshed successfully');
        } catch (error) {
            console.error('❌ Failed to refresh templates:', error);
            this.showError('Failed to refresh templates: ' + error.message);
        } finally {
            this.isLoading = false;
            this.updateLoadingState(false);
        }
    }

    // Manual repository matching trigger
    async refreshRepositoryStatus() {
        console.log('🔄 Manually refreshing repository status...');

        const authStatus = this.authManager?.getAuthStatus('github');
        if (!authStatus || !authStatus.isAuthenticated) {
            this.showWarning('GitHub authentication required for repository matching');
            return;
        }

        try {
            this.showInfo('Refreshing repository status...');

            await this.loadGitHubRepositories();
            await this.compareTemplatesWithRepositories();
            this.renderTemplates();

            this.showSuccess('Repository status updated successfully');
        } catch (error) {
            console.error('❌ Failed to refresh repository status:', error);
            this.showError('Failed to refresh repository status: ' + error.message);
        }
    }

    // Apply filters to templates
    applyFilters() {
        console.log('🔍 Applying template filters...');

        const filterValue = document.getElementById('templateFilter')?.value || 'all';
        const searchTerm = document.getElementById('templateSearch')?.value.toLowerCase().trim() || '';

        console.log(`Filter criteria: status="${filterValue}", search="${searchTerm}"`);

        this.filteredTemplates = this.templates.filter(template => {
            // Search filter
            const matchesSearch = !searchTerm ||
                template.name.toLowerCase().includes(searchTerm) ||
                template.displayName?.toLowerCase().includes(searchTerm) ||
                template.description?.toLowerCase().includes(searchTerm) ||
                template.category?.toLowerCase().includes(searchTerm) ||
                template.appName?.toLowerCase().includes(searchTerm);

            // Status filter
            let matchesFilter = true;
            switch (filterValue) {
                case 'local-only':
                    matchesFilter = !template.hasGitHubRepo || template.repoStatus?.status === 'not_found';
                    break;
                case 'with-repo':
                    matchesFilter = template.hasGitHubRepo && template.repoStatus?.status !== 'not_found';
                    break;
                case 'public':
                    matchesFilter = template.hasGitHubRepo && template.repoStatus?.status === 'public';
                    break;
                case 'private':
                    matchesFilter = template.hasGitHubRepo && template.repoStatus?.status === 'private';
                    break;
                case 'archived':
                    matchesFilter = template.hasGitHubRepo && template.repoStatus?.status === 'archived';
                    break;
                case 'disabled':
                    matchesFilter = template.hasGitHubRepo && template.repoStatus?.status === 'disabled';
                    break;
                case 'all':
                default:
                    matchesFilter = true;
            }

            return matchesSearch && matchesFilter;
        });

        console.log(`📊 Filtered ${this.filteredTemplates.length}/${this.templates.length} templates`);

        // Reset to first page when filters change
        this.currentPage = 1;
        this.renderTemplates();
        this.updateFilterStats();
    }

    // Render templates with pagination
    renderTemplates() {
        const container = document.getElementById('templatesGrid');
        if (!container) return;

        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedTemplates = this.filteredTemplates.slice(startIndex, endIndex);

        // Clear container
        container.innerHTML = '';

        if (paginatedTemplates.length === 0) {
            container.innerHTML = this.renderEmptyState();
            return;
        }

        // Render template cards
        paginatedTemplates.forEach(template => {
            const card = this.createTemplateCard(template);
            container.appendChild(card);
        });

        // Update selected template states after rendering
        this.updateSelectedTemplateStates();

        // Render pagination
        this.renderPagination();
    }

    // Create template card with action buttons
    createTemplateCard(template) {
        const card = document.createElement('div');
        card.className = `template-card ${template.hasGitHubRepo ? 'has-repo' : 'local-only'} ${template.repoStatus?.statusClass || ''}`;
        card.dataset.templateId = template.id;

        // Add click handler for template details modal
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
            // Don't trigger modal if clicking on action buttons
            if (e.target.closest('.template-actions') || e.target.closest('button')) {
                return;
            }

            this.showTemplateDetailsModal(template.id);
        });

        // Enhanced status badge with detailed information
        const statusBadge = this.createStatusBadge(template);
        const actionButtons = this.createActionButtons(template);

        card.innerHTML = `
            <div class="template-header">
                <div class="template-icon">
                    ${template.icon || '📱'}
                </div>
                <div class="template-info">
                    <h3 class="template-name">${template.displayName || template.name}</h3>
                    <p class="template-category">${template.category || 'Mobile App'}</p>
                </div>
                ${statusBadge}
            </div>
            <div class="template-description">
                ${template.description || 'No description available'}
            </div>
            <div class="template-features">
                ${(template.features || []).slice(0, 3).map(feature => 
                    `<span class="feature-tag">${feature}</span>`
                ).join('')}
            </div>
            ${this.createRepositoryInfo(template)}
            <div class="template-actions">
                ${actionButtons}
            </div>
        `;

        return card;
    }

    // Create enhanced status badge
    createStatusBadge(template) {
        const repoStatus = template.repoStatus;

        if (!repoStatus || repoStatus.status === 'not_found') {
            return `<span class="status-badge local-status" title="No GitHub repository found">
                        <i class="fas fa-laptop"></i> Local Only
                    </span>`;
        }

        const statusConfig = {
            'public': {
                icon: 'fab fa-github',
                text: 'Public Repo',
                class: 'public-repo',
                title: `Public repository: ${template.matchedRepoName || 'Unknown'}`
            },
            'private': {
                icon: 'fas fa-lock',
                text: 'Private Repo',
                class: 'private-repo',
                title: `Private repository: ${template.matchedRepoName || 'Unknown'}`
            },
            'archived': {
                icon: 'fas fa-archive',
                text: 'Archived',
                class: 'archived-repo',
                title: `Archived repository: ${template.matchedRepoName || 'Unknown'}`
            },
            'disabled': {
                icon: 'fas fa-ban',
                text: 'Disabled',
                class: 'disabled-repo',
                title: `Disabled repository: ${template.matchedRepoName || 'Unknown'}`
            }
        };

        const config = statusConfig[repoStatus.status] || statusConfig['public'];

        return `<span class="status-badge repo-status ${config.class}" title="${config.title}">
                    <i class="${config.icon}"></i> ${config.text}
                </span>`;
    }

    // Create repository information section
    createRepositoryInfo(template) {
        const repoStatus = template.repoStatus;

        if (!repoStatus || repoStatus.status === 'not_found') {
            return `<div class="repo-info no-repo">
                        <div class="repo-suggestion">
                            <i class="fas fa-info-circle"></i>
                            <span>Create a GitHub repository to enable CI/CD and collaboration</span>
                        </div>
                    </div>`;
        }

        // Show repository statistics and information
        return `<div class="repo-info has-repo">
                    <div class="repo-stats">
                        <span class="stat" title="Stars">
                            <i class="fas fa-star"></i> ${repoStatus.stars || 0}
                        </span>
                        <span class="stat" title="Forks">
                            <i class="fas fa-code-branch"></i> ${repoStatus.forks || 0}
                        </span>
                        <span class="stat" title="Last updated">
                            <i class="fas fa-clock"></i> ${this.formatDate(repoStatus.updatedAt)}
                        </span>
                        ${repoStatus.language ? `
                            <span class="stat" title="Primary language">
                                <i class="fas fa-code"></i> ${repoStatus.language}
                            </span>
                        ` : ''}
                    </div>
                    ${repoStatus.description ? `
                        <div class="repo-description">
                            <i class="fas fa-info-circle"></i>
                            <span>${repoStatus.description}</span>
                        </div>
                    ` : ''}
                    ${repoStatus.topics && repoStatus.topics.length > 0 ? `
                        <div class="repo-topics">
                            ${repoStatus.topics.slice(0, 3).map(topic =>
                                `<span class="topic-tag">${topic}</span>`
                            ).join('')}
                        </div>
                    ` : ''}
                </div>`;
    }

    // Create action buttons based on template status
    createActionButtons(template) {
        let buttons = '';
        const repoStatus = template.repoStatus;

        if (template.hasGitHubRepo && repoStatus && repoStatus.status !== 'not_found') {
            // Template has GitHub repository - show appropriate buttons based on status

            if (repoStatus.status === 'archived') {
                // Archived repository - limited actions
                buttons += `
                    <button class="btn btn-sm btn-info" onclick="appManager.viewRepository('${template.id}')" title="View archived repository">
                        <i class="fab fa-github"></i> View Archived
                    </button>
                `;
            } else if (repoStatus.status === 'disabled') {
                // Disabled repository - view only
                buttons += `
                    <button class="btn btn-sm btn-warning" onclick="appManager.viewRepository('${template.id}')" title="View disabled repository">
                        <i class="fab fa-github"></i> View Disabled
                    </button>
                `;
            } else {
                // Active repository - full functionality

                // Make private button (only for public repos)
                if (repoStatus.status === 'public') {
                    buttons += `
                        <button class="btn btn-sm btn-warning" onclick="appManager.makeRepositoryPrivate('${template.id}')" title="Make repository private">
                            <i class="fas fa-lock"></i> Make Private
                        </button>
                    `;
                }

                // Publish button (for active repos)
                buttons += `
                    <button class="btn btn-sm btn-success" onclick="appManager.publishApp('${template.id}')" title="Trigger Codemagic build">
                        <i class="fas fa-rocket"></i> Publish
                    </button>
                `;

                // View repository button
                const viewTitle = repoStatus.status === 'private' ? 'View private repository' : 'View public repository';
                buttons += `
                    <button class="btn btn-sm btn-info" onclick="appManager.viewRepository('${template.id}')" title="${viewTitle}">
                        <i class="fab fa-github"></i> View Repo
                    </button>
                `;
            }
        } else {
            // Template has no GitHub repository - no need show creation and edit buttons
            // buttons += `
            //     <button class="btn btn-sm btn-primary" onclick="appManager.createRepository('${template.id}')" title="Create GitHub repository">
            //         <i class="fab fa-github"></i> Create Repo
            //     </button>
            //     <button class="btn btn-sm btn-secondary" onclick="appManager.editTemplate('${template.id}')" title="Edit template">
            //         <i class="fas fa-edit"></i> Edit
            //     </button>
            // `;
        }

        // Always show select button for generation
        const config = this.configManager?.getConfig();
        const selectedTemplates = config?.ui?.selectedTemplates || [];
        const isSelected = selectedTemplates.includes(template.id);

        if (isSelected) {
            buttons += `
                <button class="btn btn-sm btn-success" onclick="appManager.selectTemplate('${template.id}')" title="Remove from generation queue">
                    <i class="fas fa-check"></i> Selected
                </button>
            `;
        } else {
            buttons += `
                <button class="btn btn-sm btn-outline" onclick="appManager.selectTemplate('${template.id}')" title="Add to generation queue">
                    <i class="fas fa-plus"></i> Select
                </button>
            `;
        }

        return buttons;
    }

    // Make repository private
    async makeRepositoryPrivate(templateId) {
        if (this.templateActions) {
            await this.templateActions.makeRepositoryPrivate(templateId);
        } else {
            this.showError('Template actions not available');
        }
    }

    // Publish app using Codemagic
    async publishApp(templateId) {
        if (this.templateActions) {
            await this.templateActions.publishApp(templateId);
        } else {
            this.showError('Template actions not available');
        }
    }

    // View repository on GitHub
    viewRepository(templateId) {
        if (this.templateActions) {
            this.templateActions.viewRepository(templateId);
        } else {
            this.showError('Template actions not available');
        }
    }

    // Create GitHub repository for template
    async createRepository(templateId) {
        if (this.templateActions) {
            await this.templateActions.createRepository(templateId);
        } else {
            this.showError('Template actions not available');
        }
    }

    // Edit template
    editTemplate(templateId) {
        if (this.templateActions) {
            this.templateActions.editTemplate(templateId);
        } else {
            this.showError('Template actions not available');
        }
    }

    // Show template details modal
    showTemplateDetailsModal(templateId) {
        if (this.templateActions) {
            this.templateActions.showTemplateDetailsModal(templateId);
        } else {
            // Fallback implementation
            const template = this.templates.find(t => t.id === templateId);
            if (template) {
                console.log('📋 Template details:', template);
                this.showInfo(`Template: ${template.displayName || template.name}\nCategory: ${template.category || 'General'}\nDescription: ${template.description || 'No description available'}`);
            } else {
                this.showError('Template not found');
            }
        }
    }

    // Select template for generation
    selectTemplate(templateId) {
        if (this.templateActions) {
            this.templateActions.selectTemplate(templateId);
        } else {
            // Fallback implementation if template actions not available
            console.log('⚠️ Template actions not available, using fallback select');

            try {
                const template = this.templates.find(t => t.id === templateId);
                if (!template) {
                    throw new Error('Template not found');
                }

                // Get current configuration
                const config = this.configManager?.getConfig();
                const selectedTemplates = config?.ui?.selectedTemplates || [];

                if (selectedTemplates.includes(templateId)) {
                    // Remove from selection
                    const index = selectedTemplates.indexOf(templateId);
                    selectedTemplates.splice(index, 1);
                    this.showInfo(`Removed ${template.name} from generation queue`);
                } else {
                    // Add to selection
                    selectedTemplates.push(templateId);
                    this.showSuccess(`Added ${template.name} to generation queue`);
                }

                // Update configuration
                if (this.configManager) {
                    this.configManager.updateConfig('ui.selectedTemplates', selectedTemplates);
                }

                // Re-render to update button states
                this.renderTemplates();

            } catch (error) {
                console.error('Failed to select template:', error);
                this.showError(`Failed to select template: ${error.message}`);
            }
        }
    }

    // Update template data and re-render
    updateTemplate(templateId, updatedTemplate) {
        const index = this.templates.findIndex(t => t.id === templateId);
        if (index !== -1) {
            console.log(`🔄 Updating template: ${templateId}`, updatedTemplate);

            // Merge the updated data
            this.templates[index] = { ...this.templates[index], ...updatedTemplate };

            // Re-apply filters and re-render
            this.applyFilters();

            // Update filter stats to reflect changes
            this.updateFilterStats();

            // Add visual feedback for the updated template
            setTimeout(() => {
                const templateCard = document.querySelector(`[data-template-id="${templateId}"]`);
                if (templateCard) {
                    templateCard.classList.add('status-updated');
                    setTimeout(() => {
                        templateCard.classList.remove('status-updated');
                    }, 1000);
                }
            }, 100);

            console.log(`✅ Template ${templateId} updated and UI refreshed`);
        }
    }

    // Refresh templates
    async refreshTemplates() {
        await this.loadTemplates();
        this.showSuccess('Templates refreshed successfully');
    }

    // Render pagination controls
    renderPagination() {
        const container = document.getElementById('templatesPagination');
        if (!container) return;

        const totalPages = Math.ceil(this.filteredTemplates.length / this.itemsPerPage);
        
        if (totalPages <= 1) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';
        container.innerHTML = this.createPaginationHTML(totalPages);
    }

    // Create pagination HTML
    createPaginationHTML(totalPages) {
        let html = `
            <button class="pagination-btn" ${this.currentPage === 1 ? 'disabled' : ''} 
                    onclick="appManager.goToPage(${this.currentPage - 1})">
                <i class="fas fa-chevron-left"></i> Previous
            </button>
        `;

        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            html += `
                <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" 
                        onclick="appManager.goToPage(${i})">${i}</button>
            `;
        }

        html += `
            <button class="pagination-btn" ${this.currentPage === totalPages ? 'disabled' : ''} 
                    onclick="appManager.goToPage(${this.currentPage + 1})">
                Next <i class="fas fa-chevron-right"></i>
            </button>
        `;

        return html;
    }

    // Navigate to specific page
    goToPage(page) {
        const totalPages = Math.ceil(this.filteredTemplates.length / this.itemsPerPage);
        if (page < 1 || page > totalPages) return;

        this.currentPage = page;
        this.renderTemplates();
    }

    // Update filter statistics
    updateFilterStats() {
        const statsElement = document.getElementById('filterStats');
        if (!statsElement) return;

        const total = this.templates.length;
        const localOnly = this.templates.filter(t => !t.hasGitHubRepo || t.repoStatus?.status === 'not_found').length;
        const withRepo = this.templates.filter(t => t.hasGitHubRepo && t.repoStatus?.status !== 'not_found').length;
        const publicRepos = this.templates.filter(t => t.repoStatus?.status === 'public').length;
        const privateRepos = this.templates.filter(t => t.repoStatus?.status === 'private').length;
        const archivedRepos = this.templates.filter(t => t.repoStatus?.status === 'archived').length;
        const disabledRepos = this.templates.filter(t => t.repoStatus?.status === 'disabled').length;
        const filtered = this.filteredTemplates.length;

        statsElement.innerHTML = `
            <span class="stat" title="Total templates">Total: ${total}</span>
            <span class="stat" title="Templates without GitHub repositories">Local: ${localOnly}</span>
            <span class="stat" title="Templates with GitHub repositories">With Repo: ${withRepo}</span>
            <span class="stat" title="Public repositories">Public: ${publicRepos}</span>
            <span class="stat" title="Private repositories">Private: ${privateRepos}</span>
            ${archivedRepos > 0 ? `<span class="stat" title="Archived repositories">Archived: ${archivedRepos}</span>` : ''}
            ${disabledRepos > 0 ? `<span class="stat" title="Disabled repositories">Disabled: ${disabledRepos}</span>` : ''}
            <span class="stat" title="Templates matching current filter">Filtered: ${filtered}</span>
        `;
    }

    // Render empty state
    renderEmptyState() {
        return `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>No Templates Found</h3>
                <p>No templates match your current filter criteria</p>
                <button class="btn btn-primary" onclick="appManager.clearFilters()">
                    <i class="fas fa-times"></i> Clear Filters
                </button>
            </div>
        `;
    }

    // Clear all filters
    clearFilters() {
        const filterSelect = document.getElementById('templateFilter');
        const searchInput = document.getElementById('templateSearch');
        
        if (filterSelect) filterSelect.value = 'all';
        if (searchInput) searchInput.value = '';
        
        this.applyFilters();
    }

    // Utility methods
    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    updateLoadingState(isLoading) {
        const container = document.getElementById('templatesGrid');
        if (!container) return;

        if (isLoading) {
            container.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-spinner fa-spin"></i>
                    <h3>Loading Templates...</h3>
                    <p>Comparing with GitHub repositories...</p>
                </div>
            `;
        }
    }

    // Render empty state with error message
    renderEmptyStateWithError(errorMessage) {
        const container = document.getElementById('templatesGrid');
        if (!container) return;

        container.innerHTML = `
            <div class="empty-state error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Failed to Load Templates</h3>
                <p>${errorMessage}</p>
                <button class="btn btn-primary" onclick="appManager.refreshTemplates()">
                    <i class="fas fa-sync-alt"></i> Try Again
                </button>
            </div>
        `;
    }

    showLoading(message) {
        this.showToast(message, 'info');
    }

    hideLoading() {
        // Loading is handled by toast auto-hide
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showInfo(message) {
        this.showToast(message, 'info');
    }

    // Toast notification helper
    showToast(message, type = 'info', duration = 5000) {
        // Try to use the main app's toast system first
        if (window.app && window.app.showToast) {
            window.app.showToast(message, type, duration);
        } else if (window.ui && window.ui.showToast) {
            window.ui.showToast(message, type, duration);
        } else {
            // Fallback to console and simple toast
            console.log(`[${type.toUpperCase()}] ${message}`);
            this.createSimpleToast(message, type, duration);
        }
    }

    // Simple toast implementation as fallback
    createSimpleToast(message, type, duration) {
        const toast = document.createElement('div');
        toast.className = `app-manager-toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : type === 'warning' ? '#ff9800' : '#2196f3'};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            max-width: 400px;
            word-wrap: break-word;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
        }, 100);

        // Animate out and remove
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.AppManager = AppManager;
}

// Initialize app manager when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (!window.appManager) {
                window.appManager = new AppManager();
            }
        });
    } else {
        if (!window.appManager) {
            window.appManager = new AppManager();
        }
    }
}
