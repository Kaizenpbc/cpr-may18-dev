import React, { ReactNode } from 'react';
import { usePageTransition } from '../../hooks/usePageTransition';
import PageTransition from './PageTransition';

interface TransitionWrapperProps {
  children: ReactNode;
}

const TransitionWrapper: React.FC<TransitionWrapperProps> = ({ children }) => {
  const { transitionConfig, transitionType } = usePageTransition();

  return (
    <PageTransition
      type={transitionType}
      duration={transitionConfig.duration}
      delay={transitionConfig.delay}
    >
      {children}
    </PageTransition>
  );
};

export default TransitionWrapper;
