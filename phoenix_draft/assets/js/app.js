// If you want to use Phoenix channels, run `mix help phx.gen.channel`
// to get started and then uncomment the line below.
// import "./user_socket.js"

// You can include dependencies in two ways.
//
// The simplest option is to put them in assets/vendor and
// import them using relative paths:
//
//     import "../vendor/some-package.js"
//
// Alternatively, you can `npm install some-package --prefix assets` and import
// them using a path starting with the package name:
//
//     import "some-package"
//

// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html"
// Establish Phoenix Socket and LiveView configuration.
import {Socket} from "phoenix"
import {LiveSocket} from "phoenix_live_view"
import topbar from "../vendor/topbar"

let csrfToken = document.querySelector("meta[name='csrf-token']").getAttribute("content")

// Custom hooks for LiveView
let Hooks = {}

// Hook to confirm page is fully loaded and ready
Hooks.PageReady = {
  mounted() {
    // Wait a bit to ensure everything is truly loaded
    setTimeout(() => {
      // Check if all images are loaded
      const images = this.el.querySelectorAll('img');
      let loadedImages = 0;
      let totalImages = images.length;
      
      if (totalImages === 0) {
        // No images to load, mark as ready after delay
        setTimeout(() => {
          this.pushEvent("page_fully_loaded", {});
        }, 1000);
      } else {
        // Wait for all images to load
        images.forEach(img => {
          if (img.complete) {
            loadedImages++;
          } else {
            img.addEventListener('load', () => {
              loadedImages++;
              if (loadedImages === totalImages) {
                // All images loaded, add small delay then notify
                setTimeout(() => {
                  this.pushEvent("page_fully_loaded", {});
                }, 500);
              }
            });
            img.addEventListener('error', () => {
              loadedImages++;
              if (loadedImages === totalImages) {
                // Even with errors, proceed after all attempts
                setTimeout(() => {
                  this.pushEvent("page_fully_loaded", {});
                }, 500);
              }
            });
          }
        });
        
        // If all images were already loaded
        if (loadedImages === totalImages) {
          setTimeout(() => {
            this.pushEvent("page_fully_loaded", {});
          }, 1000);
        }
        
        // Fallback: if images take too long, proceed anyway after 3 seconds
        setTimeout(() => {
          this.pushEvent("page_fully_loaded", {});
        }, 3000);
      }
    }, 500); // Initial delay to let DOM settle
  }
}

Hooks.CoinToss = {
  mounted() {
    this.handleEvent("coin_flip_result", ({result}) => {
      window.DraftSystem.initCoinFlip();
      setTimeout(() => {
        window.DraftSystem.showNotification(`Coin toss result: ${result}`, 'success');
      }, 2000);
    });
  }
}

Hooks.PresenceUpdate = {
  mounted() {
    this.handleEvent("presence_diff", ({joins, leaves}) => {
      Object.keys(joins).forEach(captain => {
        window.DraftSystem.updateCaptainStatus(captain, true);
      });
      Object.keys(leaves).forEach(captain => {
        window.DraftSystem.updateCaptainStatus(captain, false);
      });
    });
  }
}

Hooks.Timer = {
  mounted() {
    this.timerInterval = null;
    this.startTimer();
  },
  
  updated() {
    this.startTimer();
  },
  
  destroyed() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  },
  
  startTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    const timerElement = this.el.querySelector('[data-timer-remaining]');
    if (!timerElement) return;
    
    const startTime = Date.now();
    const initialRemaining = parseInt(timerElement.dataset.timerRemaining) || 0;
    
    if (initialRemaining <= 0) return;
    
    this.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, initialRemaining - elapsed);
      
      timerElement.textContent = remaining + 's';
      
      // Color changes based on remaining time - use base-time class
      if (remaining <= 5) {
        timerElement.className = 'base-time font-bold text-red-500 animate-pulse';
      } else if (remaining <= 10) {
        timerElement.className = 'base-time font-bold text-yellow-500';
      } else {
        timerElement.className = 'base-time font-bold text-white';
      }
      
      // Sound warning at 10 seconds - DISABLED
      // if (remaining === 10) {
      //   window.DraftSystem.playTimerSound('warning');
      // }
      
      // Sound alert at 5 seconds - DISABLED
      // if (remaining === 5) {
      //   window.DraftSystem.playTimerSound('urgent');
      // }
      
      // Timer expired
      if (remaining === 0) {
        clearInterval(this.timerInterval);
        // window.DraftSystem.playTimerSound('expired'); // DISABLED
        timerElement.className = 'base-time font-bold text-red-600 animate-pulse';
      }
    }, 1000);
  }
}

// Create LiveSocket with hooks
let liveSocket = new LiveSocket("/live", Socket, {
  longPollFallbackMs: 2500,
  params: {_csrf_token: csrfToken},
  hooks: Hooks
})

// Show progress bar on live navigation and form submits
topbar.config({barColors: {0: "#29d"}, shadowColor: "rgba(0, 0, 0, .3)"})
window.addEventListener("phx:page-loading-start", _info => topbar.show(300))
window.addEventListener("phx:page-loading-stop", _info => topbar.hide())

// connect if there are any LiveViews on the page
liveSocket.connect()

// expose liveSocket on window for web console debug logs and latency simulation:
// >> liveSocket.enableDebug()
// >> liveSocket.enableLatencySim(1000)  // enabled for duration of browser session
// >> liveSocket.disableLatencySim()
window.liveSocket = liveSocket

// Draft-specific JavaScript functionality
window.DraftSystem = {
  // Initialize coin flip animation
  initCoinFlip() {
    const coin = document.getElementById('coin-animation');
    if (coin) {
      coin.classList.add('animate-spin');
      setTimeout(() => {
        coin.classList.remove('animate-spin');
      }, 2000);
    }
  },

  // Show notification
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg z-50 transition-all duration-300 ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      'bg-blue-500 text-white'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  },

  // Update captain status indicators
  updateCaptainStatus(captain, online) {
    const indicator = document.querySelector(`.captain-${captain}-indicator`);
    if (indicator) {
      indicator.className = `captain-indicator ${online ? 'captain-online' : 'captain-offline'}`;
    }
  },

  // Play timer sound effects
  playTimerSound(type) {
    // Create audio context for sound effects
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const ctx = this.audioContext;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Different sounds for different timer states
    switch (type) {
      case 'warning':
        oscillator.frequency.setValueAtTime(440, ctx.currentTime); // A4 note
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        break;
      case 'urgent':
        oscillator.frequency.setValueAtTime(660, ctx.currentTime); // E5 note
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        break;
      case 'expired':
        oscillator.frequency.setValueAtTime(220, ctx.currentTime); // A3 note (lower pitch)
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        break;
    }
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  }
};

