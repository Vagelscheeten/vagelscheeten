'use client';

import React from 'react';
import { EssensspendenTabs } from './EssensspendenTabs';

export default function EssensspendenPage() {
  return (
    <div className="container py-6">
      <EssensspendenTabs showHeader={true} />
    </div>
  );
}
