import React from 'react';

// Reusable Skeleton Loader Components
export const SkeletonBox = ({ width = '100%', height = '20px', borderRadius = '4px', style = {} }) => (
  <div
    className="skeleton-box"
    style={{
      width,
      height,
      borderRadius,
      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeleton-loading 1.5s ease-in-out infinite',
      ...style
    }}
  />
);

export const SkeletonText = ({ lines = 1, gap = '8px' }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap }}>
    {Array.from({ length: lines }).map((_, idx) => (
      <SkeletonBox
        key={idx}
        height="16px"
        width={idx === lines - 1 && lines > 1 ? '80%' : '100%'}
      />
    ))}
  </div>
);

export const SkeletonCard = () => (
  <div
    style={{
      padding: '20px',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      background: '#fff'
    }}
  >
    <SkeletonBox height="24px" width="60%" style={{ marginBottom: '12px' }} />
    <SkeletonText lines={3} />
  </div>
);

export const SkeletonButton = ({ width = '100%', height = '44px' }) => (
  <SkeletonBox width={width} height={height} borderRadius="8px" />
);

export const SkeletonCircle = ({ size = '48px' }) => (
  <SkeletonBox width={size} height={size} borderRadius="50%" />
);

// Full page skeleton loader
export const SkeletonPageLoader = ({ message = 'Loading...' }) => (
  <div
    className="app-wrapper theme-tcs"
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: '24px',
      padding: '20px'
    }}
  >
    <SkeletonCircle size="72px" />
    <div style={{ width: '280px', textAlign: 'center' }}>
      <SkeletonText lines={2} gap="12px" />
    </div>
  </div>
);

// Skeleton for sheet cards grid
export const SkeletonSheetGrid = ({ count = 6 }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '16px',
      padding: '20px'
    }}
  >
    {Array.from({ length: count }).map((_, idx) => (
      <SkeletonCard key={idx} />
    ))}
  </div>
);

// Skeleton for user data table
export const SkeletonTable = ({ rows = 5 }) => (
  <div style={{ padding: '20px' }}>
    <SkeletonBox height="48px" style={{ marginBottom: '16px' }} />
    {Array.from({ length: rows }).map((_, idx) => (
      <div key={idx} style={{ marginBottom: '12px' }}>
        <SkeletonBox height="56px" />
      </div>
    ))}
  </div>
);

// Inline button skeleton (for forms)
export const SkeletonInlineButton = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <SkeletonCircle size="20px" />
    <SkeletonBox width="80px" height="20px" />
  </div>
);

// Add CSS animation to index.css or App.css
export const SkeletonStyles = `
@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.skeleton-box {
  animation: skeleton-loading 1.5s ease-in-out infinite;
}
`;
