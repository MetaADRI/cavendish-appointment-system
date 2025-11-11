/**
 * Slot Tracker Client-Side Utility
 * Handles notifications, presence tracking, and real-time updates
 */

class SlotTracker {
  constructor() {
    this.pollingInterval = null;
    this.notificationCheckInterval = 20000; // 20 seconds
    this.currentUser = null;
    this.onNotificationCallback = null;
  }

  /**
   * Initialize slot tracker
   */
  init(currentUser, onNotificationCallback) {
    this.currentUser = currentUser;
    this.onNotificationCallback = onNotificationCallback;
    
    // Start polling for notifications
    this.startPolling();
  }

  /**
   * Start polling for notifications
   */
  startPolling() {
    if (this.pollingInterval) {
      return;
    }

    // Check immediately
    this.checkNotifications();

    // Then poll every 20 seconds
    this.pollingInterval = setInterval(() => {
      this.checkNotifications();
    }, this.notificationCheckInterval);

    console.log('[SlotTracker] Polling started');
  }

  /**
   * Stop polling
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('[SlotTracker] Polling stopped');
    }
  }

  /**
   * Check for new notifications
   */
  async checkNotifications() {
    try {
      const response = await fetch('/api/appointments/notifications?unread_only=true&limit=10');
      if (response.ok) {
        const data = await response.json();
        
        if (data.notifications && data.notifications.length > 0) {
          // Process each notification
          data.notifications.forEach(notification => {
            this.processNotification(notification);
          });
        }
      }
    } catch (error) {
      console.error('[SlotTracker] Error checking notifications:', error);
    }
  }

  /**
   * Process a notification
   */
  processNotification(notification) {
    // Call callback if provided
    if (this.onNotificationCallback) {
      this.onNotificationCallback(notification);
    }

    // Handle presence prompts specially
    if (notification.type === 'presence_prompt') {
      this.showPresenceModal(notification);
    } else {
      this.showNotificationBanner(notification);
    }
  }

  /**
   * Show presence confirmation modal
   */
  showPresenceModal(notification) {
    // Check if modal already exists
    if (document.getElementById('presenceModal')) {
      return;
    }

    const modalHTML = `
      <div class="modal fade" id="presenceModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header bg-primary text-white">
              <h5 class="modal-title">
                <i class="bi bi-alarm me-2"></i>Appointment Starting Now!
              </h5>
            </div>
            <div class="modal-body text-center py-4">
              <div class="mb-3">
                <i class="bi bi-calendar-check" style="font-size: 3rem; color: var(--cavendish-navy);"></i>
              </div>
              <h5 class="mb-3">${notification.message}</h5>
              <p class="text-muted">Are you present for this meeting?</p>
              <div class="d-grid gap-2 mt-4">
                <button class="btn btn-success btn-lg" onclick="slotTracker.confirmPresence(${notification.appointment_id}, true)">
                  <i class="bi bi-check-circle me-2"></i>Yes, I'm Present
                </button>
                <button class="btn btn-outline-secondary" onclick="slotTracker.confirmPresence(${notification.appointment_id}, false)">
                  <i class="bi bi-x-circle me-2"></i>No, I'm Absent
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = new bootstrap.Modal(document.getElementById('presenceModal'));
    modal.show();

    // Mark as read
    this.markNotificationAsRead(notification.id);
  }

  /**
   * Show notification banner
   */
  showNotificationBanner(notification) {
    // Get or create notification container
    let container = document.getElementById('notificationBannerContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notificationBannerContainer';
      container.style.cssText = 'position: fixed; top: 80px; right: 20px; z-index: 1050; max-width: 350px;';
      document.body.appendChild(container);
    }

    // Determine alert type based on notification type
    let alertClass = 'alert-info';
    let icon = 'info-circle';
    
    if (notification.type === 'reminder') {
      alertClass = 'alert-warning';
      icon = 'bell';
    } else if (notification.type === 'completed') {
      alertClass = 'alert-success';
      icon = 'check-circle';
    } else if (notification.type === 'missed') {
      alertClass = 'alert-danger';
      icon = 'exclamation-triangle';
    }

    const bannerId = `notification-${notification.id}`;
    
    // Don't show if already displayed
    if (document.getElementById(bannerId)) {
      return;
    }

    const bannerHTML = `
      <div id="${bannerId}" class="alert ${alertClass} alert-dismissible fade show shadow-sm" role="alert">
        <div class="d-flex align-items-start">
          <i class="bi bi-${icon} me-2" style="font-size: 1.25rem;"></i>
          <div class="flex-grow-1">
            <small class="d-block text-muted">${new Date(notification.created_at).toLocaleTimeString()}</small>
            <div>${notification.message}</div>
          </div>
          <button type="button" class="btn-close" data-bs-dismiss="alert" onclick="slotTracker.markNotificationAsRead(${notification.id})"></button>
        </div>
      </div>
    `;

    container.insertAdjacentHTML('beforeend', bannerHTML);

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      const banner = document.getElementById(bannerId);
      if (banner) {
        banner.classList.remove('show');
        setTimeout(() => banner.remove(), 150);
      }
    }, 10000);

    // Mark as read
    this.markNotificationAsRead(notification.id);
  }

  /**
   * Confirm presence
   */
  async confirmPresence(appointmentId, isPresent) {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}/presence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ present: isPresent })
      });

      if (response.ok) {
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('presenceModal'));
        if (modal) {
          modal.hide();
          document.getElementById('presenceModal').remove();
          document.querySelector('.modal-backdrop')?.remove();
        }

        // Show confirmation
        this.showToast(
          isPresent ? 'Presence confirmed! ✓' : 'Absence recorded',
          isPresent ? 'success' : 'info'
        );

        // Reload page data if callback exists
        if (window.loadDashboardData) {
          window.loadDashboardData();
        }
      } else {
        const data = await response.json();
        this.showToast(data.error || 'Failed to confirm presence', 'danger');
      }
    } catch (error) {
      console.error('[SlotTracker] Error confirming presence:', error);
      this.showToast('Network error. Please try again.', 'danger');
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId) {
    try {
      await fetch(`/api/appointments/notifications/${notificationId}/read`, {
        method: 'PUT'
      });
    } catch (error) {
      console.error('[SlotTracker] Error marking notification as read:', error);
    }
  }

  /**
   * Show toast message
   */
  showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
      container.style.zIndex = '1100';
      document.body.appendChild(container);
    }

    const toastId = `toast-${Date.now()}`;
    const bgClass = type === 'success' ? 'bg-success' : type === 'danger' ? 'bg-danger' : type === 'warning' ? 'bg-warning' : 'bg-info';

    const toastHTML = `
      <div id="${toastId}" class="toast ${bgClass} text-white" role="alert">
        <div class="toast-body">
          ${message}
        </div>
      </div>
    `;

    container.insertAdjacentHTML('beforeend', toastHTML);
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
    toast.show();

    toastElement.addEventListener('hidden.bs.toast', () => {
      toastElement.remove();
    });
  }

  /**
   * Get upcoming appointments
   */
  async getUpcomingAppointments() {
    try {
      const response = await fetch('/api/appointments/upcoming');
      if (response.ok) {
        const data = await response.json();
        return data.appointments || [];
      }
    } catch (error) {
      console.error('[SlotTracker] Error getting upcoming appointments:', error);
    }
    return [];
  }

  /**
   * Destroy tracker
   */
  destroy() {
    this.stopPolling();
    this.currentUser = null;
    this.onNotificationCallback = null;
  }
}

// Create global instance
const slotTracker = new SlotTracker();
