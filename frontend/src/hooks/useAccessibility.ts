import { useEffect, useCallback } from 'react';

interface AccessibilityOptions {
  enableKeyboardNavigation?: boolean;
  enableScreenReader?: boolean;
  enableHighContrast?: boolean;
  enableReducedMotion?: boolean;
}

export const useAccessibility = (options: AccessibilityOptions = {}) => {
  const {
    enableKeyboardNavigation = true,
    enableScreenReader = true,
    enableHighContrast = true,
    enableReducedMotion = true,
  } = options;

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enableKeyboardNavigation) return;

    // Skip to main content (Alt + M)
    if (event.altKey && event.key === 'm') {
      event.preventDefault();
      const mainContent = document.querySelector('main, [role="main"]');
      if (mainContent) {
        (mainContent as HTMLElement).focus();
      }
    }

    // Skip to navigation (Alt + N)
    if (event.altKey && event.key === 'n') {
      event.preventDefault();
      const navigation = document.querySelector('nav, [role="navigation"]');
      if (navigation) {
        (navigation as HTMLElement).focus();
      }
    }

    // Skip to search (Alt + S)
    if (event.altKey && event.key === 's') {
      event.preventDefault();
      const search = document.querySelector('input[type="search"], [role="search"]');
      if (search) {
        (search as HTMLElement).focus();
      }
    }
  }, [enableKeyboardNavigation]);

  // Handle focus management
  const manageFocus = useCallback(() => {
    if (!enableScreenReader) return;

    // Add focus indicators to all interactive elements
    const interactiveElements = document.querySelectorAll(
      'button, [role="button"], a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    interactiveElements.forEach((element) => {
      element.addEventListener('focus', () => {
        element.classList.add('focus-visible');
      });

      element.addEventListener('blur', () => {
        element.classList.remove('focus-visible');
      });
    });
  }, [enableScreenReader]);

  // Handle reduced motion
  const handleReducedMotion = useCallback(() => {
    if (!enableReducedMotion) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      document.documentElement.style.setProperty('--animation-duration', '0.01ms');
      document.documentElement.style.setProperty('--animation-iteration-count', '1');
    } else {
      document.documentElement.style.setProperty('--animation-duration', '');
      document.documentElement.style.setProperty('--animation-iteration-count', '');
    }
  }, [enableReducedMotion]);

  // Handle high contrast
  const handleHighContrast = useCallback(() => {
    if (!enableHighContrast) return;

    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    
    if (prefersHighContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [enableHighContrast]);

  // Setup accessibility features
  useEffect(() => {
    // Add keyboard event listener
    document.addEventListener('keydown', handleKeyDown);

    // Setup focus management
    manageFocus();

    // Setup reduced motion
    handleReducedMotion();

    // Setup high contrast
    handleHighContrast();

    // Add accessibility meta tags
    const metaViewport = document.querySelector('meta[name="viewport"]');
    if (metaViewport) {
      metaViewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
    }

    // Add skip links
    const skipLinks = document.createElement('div');
    skipLinks.innerHTML = `
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <a href="#navigation" class="skip-link">Skip to navigation</a>
      <a href="#search" class="skip-link">Skip to search</a>
    `;
    skipLinks.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      z-index: 1000;
    `;
    document.body.insertBefore(skipLinks, document.body.firstChild);

    // Add accessibility styles
    const style = document.createElement('style');
    style.textContent = `
      .skip-link {
        position: absolute;
        top: -40px;
        left: 6px;
        background: #000;
        color: #fff;
        padding: 8px;
        text-decoration: none;
        border-radius: 4px;
        z-index: 1000;
        transition: top 0.3s;
      }
      
      .skip-link:focus {
        top: 6px;
      }
      
      .focus-visible {
        outline: 2px solid #1976d2 !important;
        outline-offset: 2px !important;
      }
      
      .high-contrast {
        filter: contrast(150%);
      }
      
      .high-contrast * {
        border-color: currentColor !important;
      }
      
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
      
      @media (prefers-contrast: high) {
        * {
          border-color: currentColor !important;
        }
      }
    `;
    document.head.appendChild(style);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.head.removeChild(style);
      if (document.body.firstChild === skipLinks) {
        document.body.removeChild(skipLinks);
      }
    };
  }, [handleKeyDown, manageFocus, handleReducedMotion, handleHighContrast]);

  // Utility functions
  const announceToScreenReader = useCallback((message: string) => {
    if (!enableScreenReader) return;

    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, [enableScreenReader]);

  const setFocus = useCallback((selector: string) => {
    const element = document.querySelector(selector);
    if (element) {
      (element as HTMLElement).focus();
    }
  }, []);

  return {
    announceToScreenReader,
    setFocus,
  };
};

export default useAccessibility;
