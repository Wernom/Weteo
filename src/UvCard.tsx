import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';

import i18n from './i18n';
import { DayIndexCard, IndexCard, type Scale } from './IndexCard';
import { useScreenStyles } from './Screen';
import { type Palette, space, usePalette, uvColor } from './theme';
import { type HourlyForecast, UV_LEVELS, uvLevel } from './weather';

// « Modéré » pour 3. Les composants appellent useTranslation() pour suivre la langue.
const uvScale =
  (c: Palette): Scale =>
  (uv) => ({ label: i18n.t(`uv.niveaux.${UV_LEVELS[uvLevel(uv)]}`), color: uvColor(c, uv) });

// Indice UV de l'écran Météo : actuel, maximum du jour, puis heure par heure, de jour seulement
// (la nuit, il est nul). L'indice s'affiche arrondi, comme celui de l'OMS.
export function UvCard({
  uv,
  max,
  hours,
}: {
  uv: number | null;
  max: number | null;
  hours: HourlyForecast[];
}) {
  const { t } = useTranslation();
  const c = usePalette();
  const shared = useScreenStyles();
  if (uv === null) return null;
  const scale = uvScale(c);

  return (
    <IndexCard
      id="uv"
      testID="uv"
      title={t('meteo.uv')}
      value={Math.round(uv)}
      scale={scale}
      a11yKey="meteo.uvDetail"
      hourA11yKey="meteo.uvHeureDetail"
      hours={hours}
      pick={(hour) => (hour.isDay && hour.uvIndex !== null ? Math.round(hour.uvIndex) : null)}
    >
      {max !== null && (
        <Text testID="uv-max" style={[shared.detail, { marginTop: space.m }]}>
          {t('meteo.uvMaxJour', { index: Math.round(max), level: scale(max).label })}
        </Text>
      )}
    </IndexCard>
  );
}

// Indice UV de l'écran du jour : son maximum.
export function DayUvCard({ max }: { max: number | null }) {
  const { t } = useTranslation();
  const c = usePalette();
  if (max === null) return null;

  return (
    <DayIndexCard
      testID="uv-jour"
      title={t('meteo.uv')}
      color={uvColor(c, max)}
      text={t('jour.uvMax', { index: Math.round(max), level: uvScale(c)(max).label })}
    />
  );
}
