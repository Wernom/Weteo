import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';

import { formatHour } from './i18n';
import { iconColor, themedStyles, usePalette } from './theme';
import { useUnits } from './units';
import { describeWeather, HourlyForecast } from './weather';

// Bandeau horizontal des prochaines heures ; la première est l'heure en cours.
export function HourlyStrip({ hours }: { hours: HourlyForecast[] }) {
  const { t } = useTranslation();
  const units = useUnits();
  const c = usePalette();
  const styles = useStyles();
  return (
    <ScrollView
      testID="bandeau-horaire"
      horizontal
      // Android : sans ça, le balayage entre villes (onglet Météo) vole le geste au bandeau.
      nestedScrollEnabled
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
    >
      {hours.map((hour, i) => {
        const d = describeWeather(hour.weatherCode, hour.isDay);
        const label = i === 0 ? t('meteo.maintenant') : formatHour(hour.time);
        const temperature = units.temp(hour.temperature);
        return (
          <View
            key={hour.time}
            testID={`heure-${i}`}
            style={styles.hour}
            accessible
            accessibilityLabel={t('meteo.heureDetail', {
              hour: label,
              weather: d.label,
              temperature,
              rain: hour.rainChance,
            })}
          >
            <Text style={styles.time}>{label}</Text>
            <Ionicons name={d.icon} size={28} color={iconColor(c, d.icon)} />
            <Text style={styles.temp}>{temperature}</Text>
            <Text style={styles.rain}>
              <Ionicons name="water" size={12} color={c.secondary} />{' '}
              {t('meteo.pourcent', { value: hour.rainChance })}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const useStyles = themedStyles((c) => ({
  strip: { gap: 4 },
  hour: { alignItems: 'center', gap: 6, minWidth: 64, paddingVertical: 4 },
  time: { color: c.text, fontSize: 14 },
  temp: { color: c.text, fontSize: 18, fontWeight: '600' },
  rain: { color: c.secondary, fontSize: 13 },
}));
