/**
 * Build Status Manager
 * Handles build status tracking, localStorage persistence, and real-time updates
 */

class BuildStatusManager {
    constructor() {
        this.storageKey = 'cordova-generator-build-history';
        this.expirationDays = 30;
        this.pollingInterval = 45000; // 45 seconds
        this.activePolling = new Map(); // buildId -> intervalId
        this.eventListeners = new Map();
        this.codemagicIntegration = null;
        
        // Build status constants
        this.STATUS = {
            QUEUED: 'queued',
            BUILDING: 'building',
            SUCCESS: 'success',
            FAILED: 'failed',
            CANCELLED: 'cancelled',
            TIMEOUT: 'timeout'
        };
        
        // Initialize on construction
        this.init();
    }

    // Initialize the manager
    init() {
        this.cleanExpiredBuilds();
        this.loadBuildHistory();
    }

    // Event system
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => callback(data));
        }
    }

    // Set Codemagic integration instance
    setCodemagicIntegration(codemagicIntegration) {
        this.codemagicIntegration = codemagicIntegration;
    }

    // Save build information
    saveBuild(buildInfo) {
        try {
            const builds = this.loadBuildHistory();
            const buildData = {
                id: buildInfo.buildId,
                appName: buildInfo.appName,
                buildId: buildInfo.buildId,
                applicationId: buildInfo.applicationId,
                status: buildInfo.status || this.STATUS.QUEUED,
                workflowId: buildInfo.workflowId,
                branch: buildInfo.branch,
                buildUrl: buildInfo.buildUrl,
                projectUrl: buildInfo.projectUrl,
                timestamp: buildInfo.timestamp || new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                artifacts: buildInfo.artifacts || [],
                logs: buildInfo.logs || null,
                duration: buildInfo.duration || null,
                startedAt: buildInfo.startedAt || null,
                finishedAt: buildInfo.finishedAt || null
            };

            // Update existing build or add new one
            const existingIndex = builds.findIndex(b => b.buildId === buildData.buildId);
            if (existingIndex >= 0) {
                builds[existingIndex] = { ...builds[existingIndex], ...buildData };
            } else {
                builds.unshift(buildData); // Add to beginning
            }

            // Keep only recent builds (limit to 100)
            const limitedBuilds = builds.slice(0, 100);
            
            localStorage.setItem(this.storageKey, JSON.stringify(limitedBuilds));
            
            this.emit('build:saved', buildData);
            return buildData;
            
        } catch (error) {
            console.error('Failed to save build:', error);
            this.emit('build:save:error', { error, buildInfo });
            return null;
        }
    }

    // Load build history from localStorage
    loadBuildHistory() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (!stored) return [];
            
            const builds = JSON.parse(stored);
            return Array.isArray(builds) ? builds : [];
            
        } catch (error) {
            console.error('Failed to load build history:', error);
            return [];
        }
    }

    // Get build by ID
    getBuild(buildId) {
        const builds = this.loadBuildHistory();
        return builds.find(b => b.buildId === buildId);
    }

    // Get builds by app name
    getBuildsByApp(appName) {
        const builds = this.loadBuildHistory();
        return builds.filter(b => b.appName === appName);
    }

    // Get recent builds (last 24 hours)
    getRecentBuilds() {
        const builds = this.loadBuildHistory();
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return builds.filter(b => new Date(b.timestamp) > oneDayAgo);
    }

    // Update build status
    async updateBuildStatus(buildId, forceUpdate = false) {
        if (!this.codemagicIntegration || !this.codemagicIntegration.isAuthenticated) {
            console.warn('Codemagic integration not available for status update');
            return null;
        }

        try {
            const build = this.getBuild(buildId);
            if (!build) {
                console.warn(`Build ${buildId} not found in history`);
                return null;
            }

            // Skip if build is already completed and not forced
            if (!forceUpdate && this.isBuildCompleted(build.status)) {
                return build;
            }

            this.emit('build:status:checking', { buildId });

            // Get status from Codemagic API
            const statusData = await this.codemagicIntegration.getBuildStatus(buildId);
            
            // Map Codemagic status to our status constants
            const mappedStatus = this.mapCodemagicStatus(statusData.status);
            
            // Get artifacts if build is successful
            let artifacts = [];
            if (mappedStatus === this.STATUS.SUCCESS) {
                try {
                    artifacts = await this.codemagicIntegration.getBuildArtifacts(buildId);
                } catch (artifactError) {
                    console.warn('Failed to get artifacts:', artifactError);
                }
            }

            // Update build data
            const updatedBuild = this.saveBuild({
                ...build,
                status: mappedStatus,
                lastUpdated: new Date().toISOString(),
                startedAt: statusData.startedAt,
                finishedAt: statusData.finishedAt,
                duration: this.calculateDuration(statusData.startedAt, statusData.finishedAt),
                artifacts: artifacts
            });

            this.emit('build:status:updated', updatedBuild);

            // Stop polling if build is completed
            if (this.isBuildCompleted(mappedStatus)) {
                this.stopPolling(buildId);
                this.emit('build:completed', updatedBuild);
            }

            return updatedBuild;

        } catch (error) {
            console.error(`Failed to update build status for ${buildId}:`, error);
            this.emit('build:status:error', { buildId, error });
            return null;
        }
    }

    // Map Codemagic status to our constants
    mapCodemagicStatus(codemagicStatus) {
        const statusMap = {
            'queued': this.STATUS.QUEUED,
            'preparing': this.STATUS.BUILDING,
            'building': this.STATUS.BUILDING,
            'testing': this.STATUS.BUILDING,
            'publishing': this.STATUS.BUILDING,
            'success': this.STATUS.SUCCESS,
            'finished': this.STATUS.SUCCESS,
            'failed': this.STATUS.FAILED,
            'cancelled': this.STATUS.CANCELLED,
            'timeout': this.STATUS.TIMEOUT,
            'skipped': this.STATUS.CANCELLED
        };
        
        return statusMap[codemagicStatus?.toLowerCase()] || this.STATUS.QUEUED;
    }

    // Check if build status is completed
    isBuildCompleted(status) {
        return [this.STATUS.SUCCESS, this.STATUS.FAILED, this.STATUS.CANCELLED, this.STATUS.TIMEOUT].includes(status);
    }

    // Calculate build duration
    calculateDuration(startedAt, finishedAt) {
        if (!startedAt || !finishedAt) return null;
        
        const start = new Date(startedAt);
        const finish = new Date(finishedAt);
        const durationMs = finish.getTime() - start.getTime();
        
        if (durationMs < 0) return null;
        
        const minutes = Math.floor(durationMs / 60000);
        const seconds = Math.floor((durationMs % 60000) / 1000);
        
        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }

    // Start polling for build status updates
    startPolling(buildId) {
        if (this.activePolling.has(buildId)) {
            return; // Already polling
        }

        const intervalId = setInterval(async () => {
            await this.updateBuildStatus(buildId);
        }, this.pollingInterval);

        this.activePolling.set(buildId, intervalId);
        this.emit('build:polling:started', { buildId });
    }

    // Stop polling for a specific build
    stopPolling(buildId) {
        if (this.activePolling.has(buildId)) {
            clearInterval(this.activePolling.get(buildId));
            this.activePolling.delete(buildId);
            this.emit('build:polling:stopped', { buildId });
        }
    }

    // Stop all polling
    stopAllPolling() {
        this.activePolling.forEach((intervalId, buildId) => {
            clearInterval(intervalId);
            this.emit('build:polling:stopped', { buildId });
        });
        this.activePolling.clear();
    }

    // Start polling for all active builds
    startPollingActiveBuilds() {
        const builds = this.loadBuildHistory();
        const activeBuilds = builds.filter(b => !this.isBuildCompleted(b.status));
        
        activeBuilds.forEach(build => {
            this.startPolling(build.buildId);
        });

        if (activeBuilds.length > 0) {
            this.emit('build:polling:active', { count: activeBuilds.length });
        }
    }

    // Clean expired builds
    cleanExpiredBuilds() {
        try {
            const builds = this.loadBuildHistory();
            const expirationDate = new Date(Date.now() - this.expirationDays * 24 * 60 * 60 * 1000);
            
            const validBuilds = builds.filter(build => {
                return new Date(build.timestamp) > expirationDate;
            });

            if (validBuilds.length !== builds.length) {
                localStorage.setItem(this.storageKey, JSON.stringify(validBuilds));
                this.emit('build:history:cleaned', { 
                    removed: builds.length - validBuilds.length,
                    remaining: validBuilds.length 
                });
            }

        } catch (error) {
            console.error('Failed to clean expired builds:', error);
        }
    }

    // Clear all build history
    clearBuildHistory() {
        try {
            localStorage.removeItem(this.storageKey);
            this.stopAllPolling();
            this.emit('build:history:cleared', {});
            return true;
        } catch (error) {
            console.error('Failed to clear build history:', error);
            return false;
        }
    }

    // Get build statistics
    getBuildStats() {
        const builds = this.loadBuildHistory();
        const stats = {
            total: builds.length,
            success: builds.filter(b => b.status === this.STATUS.SUCCESS).length,
            failed: builds.filter(b => b.status === this.STATUS.FAILED).length,
            building: builds.filter(b => b.status === this.STATUS.BUILDING).length,
            queued: builds.filter(b => b.status === this.STATUS.QUEUED).length,
            recent: this.getRecentBuilds().length
        };
        
        stats.successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;
        
        return stats;
    }

    // Get status badge info
    getStatusBadge(status) {
        const badges = {
            [this.STATUS.QUEUED]: { text: 'Queued', class: 'badge-queued', color: '#6B7280', icon: '⏳' },
            [this.STATUS.BUILDING]: { text: 'Building', class: 'badge-building', color: '#F59E0B', icon: '🔄' },
            [this.STATUS.SUCCESS]: { text: 'Success', class: 'badge-success', color: '#10B981', icon: '✅' },
            [this.STATUS.FAILED]: { text: 'Failed', class: 'badge-failed', color: '#EF4444', icon: '❌' },
            [this.STATUS.CANCELLED]: { text: 'Cancelled', class: 'badge-cancelled', color: '#6B7280', icon: '⏹️' },
            [this.STATUS.TIMEOUT]: { text: 'Timeout', class: 'badge-timeout', color: '#F97316', icon: '⏰' }
        };
        
        return badges[status] || badges[this.STATUS.QUEUED];
    }

    // Format timestamp for display
    formatTimestamp(timestamp) {
        if (!timestamp) return 'Unknown';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    }

    // Export build history
    exportBuildHistory() {
        const builds = this.loadBuildHistory();
        const exportData = {
            exportDate: new Date().toISOString(),
            version: '1.0',
            builds: builds
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    // Import build history
    importBuildHistory(jsonData) {
        try {
            const importData = JSON.parse(jsonData);
            if (importData.builds && Array.isArray(importData.builds)) {
                localStorage.setItem(this.storageKey, JSON.stringify(importData.builds));
                this.emit('build:history:imported', { count: importData.builds.length });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to import build history:', error);
            return false;
        }
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.BuildStatusManager = BuildStatusManager;
}
