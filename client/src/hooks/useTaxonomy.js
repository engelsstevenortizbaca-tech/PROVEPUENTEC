import { useContext } from 'react';
import { TaxonomyContext } from '../context/TaxonomyContext';

export function useTaxonomy() {
  const context = useContext(TaxonomyContext);
  if (context === null) {
    throw new Error('useTaxonomy debe usarse dentro de <TaxonomyProvider>');
  }
  return context;
}
