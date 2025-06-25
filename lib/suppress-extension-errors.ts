// Suppress noisy errors from browser extensions
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args) => {
    const errorString = args.join(' ');
    
    // Suppress known extension errors
    const suppressPatterns = [
      'Attempting to use a disconnected port object',
      'Extension context invalidated',
      'Cannot access a chrome:// URL',
      'ResizeObserver loop limit exceeded',
    ];
    
    const shouldSuppress = suppressPatterns.some(pattern => 
      errorString.includes(pattern)
    );
    
    if (!shouldSuppress) {
      originalError.apply(console, args);
    }
  };
}