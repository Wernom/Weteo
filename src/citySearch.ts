import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSettings } from './settings';
import { City, searchCities } from './weather';

export const where = (city: City) => [city.region, city.country].filter(Boolean).join(', ');

// Recherche de villes de l'onglet Villes et du radar, sur le texte tapé. `term` vide : rien cherché.
export function useCitySearch(text: string) {
  const { t } = useTranslation();
  const { language } = useSettings();
  const [term, setTerm] = useState('');
  // On attend une pause dans la frappe avant d'interroger l'API.
  useEffect(() => {
    const timer = setTimeout(() => setTerm(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text]);

  // Avec une seule lettre, l'API ne renvoie jamais rien : inutile de l'appeler.
  const enabled = term.length >= 2;
  const query = useQuery({
    // Une recherche faite dans une autre langue n'est pas resservie.
    queryKey: ['villes', language, term],
    queryFn: () => searchCities(term, language),
    enabled,
    placeholderData: keepPreviousData,
    // Les villes ne changent pas : une recherche encore en cache n'est pas relancée.
    staleTime: Infinity,
  });

  let message: string | null = null;
  if (!enabled) message = t('villes.deuxLettres');
  else if (query.error) message = t(query.error.message);
  else if (query.data?.length === 0) message = t('villes.aucune', { term });

  return { term, message, ...query };
}
