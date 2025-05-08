'use client';

import React, { useState } from 'react';
import SpielCard, { Spiel } from '@/components/SpielCard';
import SpielModal from '@/components/SpielModal';

interface SpielCardClientProps {
  spiel: Spiel;
}

const SpielCardClient: React.FC<SpielCardClientProps> = ({ spiel }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCardClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <SpielCard spiel={spiel} onClick={handleCardClick} />
      <SpielModal 
        spiel={spiel} 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
      />
    </>
  );
};

export default SpielCardClient;
