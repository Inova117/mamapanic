// ─────────────────────────────────────────────────────────────────────────────
// Public landing / welcome page (site root on web, pre-login on native).
// Extended feature showcase: each section pairs a faithful phone mockup of a real
// app screen with its explanation. Same dark "3 AM doctrine" theme as the app.
// Logged-in users are redirected into the app by app/index.tsx.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, fontSize, spacing, borderRadius } from '../theme/theme';

const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL || '';
const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL || '';

type Ion = keyof typeof Ionicons.glyphMap;

// ── Phone mockup shell ───────────────────────────────────────────────────────
const Phone: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.phone}>
    <View style={styles.screen}>
      <View style={styles.notch}><View style={styles.notchBar} /></View>
      {children}
    </View>
  </View>
);

const TabBar: React.FC<{ icons: Ion[]; active: number }> = ({ icons, active }) => (
  <View style={styles.tabbar}>
    {icons.map((n, i) => (
      <Ionicons key={i} name={n} size={19} color={i === active ? colors.accent.gold : colors.text.muted} />
    ))}
  </View>
);

// ── Mock screens (faithful to the real app screens) ──────────────────────────
const MockHome = () => (
  <>
    <View style={styles.sc}>
      <Text style={styles.scH}>Entresueños</Text>
      <Text style={styles.scSub}>Estás haciendo un gran trabajo</Text>
      <View style={styles.commbar}>
        <Ionicons name="moon" size={13} color={colors.accent.gold} />
        <Text style={styles.commText}>Marta y 47 mamás despiertas contigo.</Text>
      </View>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={styles.prompt}>¿Cómo te sientes ahora mismo?</Text>
        <Text style={styles.promptSub}>Si te sientes abrumada, toca el botón</Text>
        <View style={styles.checkcard}>
          <Ionicons name="sunny" size={16} color={colors.accent.gold} />
          <Text style={styles.checkcardText}>¿Cómo amaneciste hoy?</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.text.muted} />
        </View>
      </View>
      <View style={styles.panic}>
        <Ionicons name="pulse" size={22} color="#23140f" />
        <Text style={styles.panicT}>PÁNICO</Text>
        <Text style={styles.panicS}>Toca si necesitas calma</Text>
      </View>
    </View>
    <TabBar icons={['home', 'chatbubble-ellipses', 'journal', 'mail', 'person']} active={0} />
  </>
);

const MockBitacora = () => (
  <>
    <View style={styles.sc}>
      <Text style={styles.scH}>Bitácora de Sueño</Text>
      <Text style={styles.scSub}>Registro diario para tu coach</Text>
      <View style={styles.today}>
        <View style={styles.todayHead}>
          <Ionicons name="checkmark-circle" size={16} color={colors.accent.sage} />
          <Text style={styles.todayTitle}>Día #5 registrado</Text>
        </View>
        <View style={styles.miniRow}><Ionicons name="sunny-outline" size={14} color={colors.accent.gold} /><Text style={styles.miniText}>Despertó: 7:10 AM</Text></View>
        <View style={styles.miniRow}><Ionicons name="moon-outline" size={14} color={colors.accent.terracotta} /><Text style={styles.miniText}>3 despertares</Text></View>
        <View style={styles.miniRow}><Ionicons name="happy-outline" size={14} color={colors.accent.sage} /><Text style={styles.miniText}>Humor: Tranquilo</Text></View>
        <View style={styles.aisum}>
          <Text style={styles.aisumLabel}>Resumen para tu coach</Text>
          <Text style={styles.aisumText}>Noche estable con 3 despertares breves; la siesta de la tarde ayudó a consolidar el sueño.</Text>
        </View>
      </View>
      <View style={styles.chip}><Text style={styles.chipText}>Historial · Día #4 · Día #3 · Día #2…</Text></View>
    </View>
    <TabBar icons={['home', 'chatbubble-ellipses', 'journal', 'mail', 'person']} active={2} />
  </>
);

const MockChat = () => (
  <>
    <View style={styles.sc}>
      <Text style={styles.scH}>Abuela Sabia</Text>
      <Text style={styles.scSub}>Aquí para escucharte</Text>
      <View style={{ flex: 1, justifyContent: 'flex-end', gap: 8 }}>
        <View style={[styles.bubble, styles.bMe]}><Text style={styles.bMeText}>No puedo más, estoy agotada 😔</Text></View>
        <View style={[styles.bubble, styles.bThem]}>
          <View style={styles.bName}><Ionicons name="heart-circle" size={12} color={colors.accent.terracotta} /><Text style={styles.bNameText}>Abuela Sabia</Text></View>
          <Text style={styles.bThemText}>Entiendo lo agotada que estás. Es válido sentirse así. Respira hondo — este momento va a pasar. 💛</Text>
        </View>
        <View style={[styles.bubble, styles.bMe]}><Text style={styles.bMeText}>Gracias, lo necesitaba</Text></View>
      </View>
    </View>
    <View style={styles.chatInput}>
      <View style={styles.chatField}><Text style={styles.chatFieldText}>Escribe cómo te sientes…</Text></View>
      <View style={styles.sendBtn}><Ionicons name="send" size={16} color="#0e1a14" /></View>
    </View>
  </>
);

const MockCheckin = () => (
  <>
    <View style={styles.sc}>
      <Text style={styles.scH}>Check-in de hoy</Text>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={styles.prompt}>¿Cómo fue tu noche?</Text>
        <Text style={styles.promptSub}>Toca cómo te sientes ahora</Text>
        <View style={styles.moodRow}>
          <View style={styles.mood}><Text style={styles.moodE}>😢</Text><Text style={styles.moodL}>Difícil</Text></View>
          <View style={[styles.mood, styles.moodSel]}><Text style={styles.moodE}>😐</Text><Text style={styles.moodL}>Regular</Text></View>
          <View style={styles.mood}><Text style={styles.moodE}>🙂</Text><Text style={styles.moodL}>Bien</Text></View>
        </View>
        <View style={[styles.chip, { marginTop: spacing.md }]}><Text style={styles.chipText}>💤 ¿Cuánto dormiste?  ·  Nada / 1-2h / 2-4h…</Text></View>
        <View style={[styles.chip, { marginTop: spacing.sm }]}><Text style={styles.chipText}>📝 Desahógate aquí… lo que necesites soltar.</Text></View>
      </View>
    </View>
    <TabBar icons={['home', 'chatbubble-ellipses', 'journal', 'mail', 'person']} active={0} />
  </>
);

const MockCoach = () => (
  <>
    <View style={styles.sc}>
      <Text style={styles.scH}>Dashboard Coach</Text>
      <Text style={styles.scSub}>4 clientas registradas</Text>
      <View style={styles.statsRow}>
        <View style={styles.stat}><Text style={[styles.statN, { color: colors.accent.sage }]}>4</Text><Text style={styles.statK}>Clientas</Text></View>
        <View style={styles.stat}><Text style={[styles.statN, { color: colors.accent.gold }]}>18</Text><Text style={styles.statK}>Bitácoras</Text></View>
        <View style={styles.stat}><Text style={[styles.statN, { color: colors.accent.terracotta }]}>2</Text><Text style={styles.statK}>Sin leer</Text></View>
      </View>
      <Text style={styles.coachLabel}>Clientas</Text>
      <View style={styles.client}>
        <View style={styles.av}><Ionicons name="person" size={16} color={colors.text.muted} /></View>
        <View style={{ flex: 1 }}><Text style={styles.clientName}>Ana López</Text><Text style={styles.clientMeta}>Día #6 · hace 2 h</Text></View>
        <View style={styles.badge}><Text style={styles.badgeText}>2</Text></View>
      </View>
      <View style={styles.client}>
        <View style={styles.av}><Ionicons name="person" size={16} color={colors.text.muted} /></View>
        <View style={{ flex: 1 }}><Text style={styles.clientName}>Lucía Marín</Text><Text style={styles.clientMeta}>Día #12 · ayer</Text></View>
      </View>
    </View>
    <TabBar icons={['stats-chart', 'flask', 'chatbubbles', 'journal', 'person']} active={0} />
  </>
);

// ── Feature row (phone + copy, alternating on wide screens) ───────────────────
type Feat = { kicker: string; title: string; copy: string; bullets: string[]; mock: React.ReactNode; reversed?: boolean };

const FeatureRow: React.FC<Feat & { isWide: boolean }> = ({ kicker, title, copy, bullets, mock, reversed, isWide }) => {
  const copyEl = (
    <View key="copy" style={[styles.col, isWide && styles.colFlex]}>
      <Text style={styles.kicker}>{kicker}</Text>
      <Text style={styles.h2}>{title}</Text>
      <Text style={styles.copyP}>{copy}</Text>
      <View style={styles.bullets}>
        {bullets.map((b, i) => (
          <View key={i} style={styles.bulletRow}>
            <Ionicons name="checkmark-circle" size={16} color={colors.accent.sage} style={{ marginTop: 1 }} />
            <Text style={styles.bulletText}>{b}</Text>
          </View>
        ))}
      </View>
    </View>
  );
  const artEl = <View key="art" style={[styles.col, styles.artCol, isWide && styles.colFlex]}>{mock}</View>;
  const kids = isWide && reversed ? [artEl, copyEl] : [copyEl, artEl];
  return <View style={[styles.feat, isWide && styles.featWide]}>{kids}</View>;
};

export default function LandingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 820;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          {/* Top bar */}
          <View style={styles.top}>
            <View style={styles.mark}>
              <View style={styles.markDot}><Text style={{ fontSize: 15 }}>💛</Text></View>
              <Text style={styles.markText}>Entresueños</Text>
            </View>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => router.push('/auth/login')} accessibilityRole="button" accessibilityLabel="Iniciar sesión">
              <Text style={styles.ghostBtnText}>Iniciar sesión</Text>
            </TouchableOpacity>
          </View>

          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.eyebrow}><Ionicons name="moon" size={13} color={colors.accent.gold} /><Text style={styles.eyebrowText}>Para el posparto</Text></View>
            <Text style={[styles.h1, { fontSize: isWide ? 64 : 40 }]}>Entresueños</Text>
            <Text style={styles.tagline}>Tu santuario de calma en el posparto</Text>
            <Text style={styles.lede}>
              De pánico a calma en menos de 30 segundos. Respira, registra el sueño de tu bebé y habla
              con alguien que te entiende — a la hora que sea.
            </Text>
            <View style={styles.ctaRow}>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/auth/register')} accessibilityRole="button" accessibilityLabel="Crear cuenta gratis">
                <Text style={styles.primaryBtnText}>Crear cuenta gratis</Text>
                <Ionicons name="arrow-forward" size={20} color="#23140f" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/auth/login')} accessibilityRole="button" accessibilityLabel="Ya tengo cuenta">
                <Text style={styles.secondaryBtnText}>Ya tengo cuenta</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.reassure}><Ionicons name="heart" size={15} color={colors.accent.terracottaLight} /><Text style={styles.reassureText}>Miles de mamás despiertas, acompañándose entre sí.</Text></View>
          </View>

          {/* Features */}
          <FeatureRow isWide={isWide}
            kicker="Botón de pánico" title="Calma en 30 segundos"
            copy="Cuando todo se siente demasiado, un solo toque te lleva a una respiración guiada 4-7-8 y a palabras que te recuerdan que lo estás haciendo bien."
            bullets={['Respiración guiada que calma tu sistema nervioso.', 'Tarjetas de validación — funcionan incluso sin internet.', 'Siempre a un toque, en la pantalla de inicio.']}
            mock={<Phone><MockHome /></Phone>} />

          <FeatureRow isWide={isWide} reversed
            kicker="Bitácora de sueño" title="Registra las noches, entiende los patrones"
            copy="Anota siestas, despertares y rutina en un formulario simple. Tu coach lo recibe al instante, con un resumen automático que resalta lo importante."
            bullets={['Un registro por día — editable cuando quieras.', 'Siestas, despertares nocturnos, rutina y humor.', 'Resumen para tu coach, generado automáticamente.']}
            mock={<Phone><MockBitacora /></Phone>} />

          <FeatureRow isWide={isWide}
            kicker="Compañera de IA" title="Abuela Sabia te escucha, sin juzgar"
            copy="Una voz cálida disponible a cualquier hora de la madrugada. Valida lo que sientes primero, y siempre te recuerda que no estás sola."
            bullets={['Respuestas cortas y reconfortantes, en español.', 'Tu conversación se guarda y continúa contigo.', 'Nunca juzga tus decisiones de crianza.']}
            mock={<Phone><MockChat /></Phone>} />

          <FeatureRow isWide={isWide} reversed
            kicker="Check-in diario" title="Un minuto para ti, cada día"
            copy="Registra tu ánimo, cuánto dormiste y desahógate en un espacio seguro. Recibes una validación cálida al instante — porque tu bienestar también importa."
            bullets={['Ánimo, sueño y un espacio para desahogarte.', 'Validación con IA al terminar.', 'Rápido, privado y sin juicios.']}
            mock={<Phone><MockCheckin /></Phone>} />

          <FeatureRow isWide={isWide}
            kicker="Acompañamiento" title="Tu coach de sueño, contigo"
            copy="Habla directo con tu coach y comparte tus bitácoras. Del otro lado, ella ve tus registros y responde con un plan pensado para ti y tu bebé."
            bullets={['Mensajería directa con tu coach.', 'La coach ve tus bitácoras y patrones.', 'Acompañamiento humano, no solo una app.']}
            mock={<Phone><MockCoach /></Phone>} />

          {/* Closing */}
          <View style={styles.closing}>
            <Text style={styles.closingTitle}>No tienes que hacerlo sola.</Text>
            <Text style={styles.closingText}>Únete a Entresueños y encuentra calma, orden y compañía en el posparto.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/auth/register')} accessibilityRole="button" accessibilityLabel="Empezar ahora">
              <Text style={styles.primaryBtnText}>Empezar ahora</Text>
              <Ionicons name="arrow-forward" size={20} color="#23140f" />
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            {!!PRIVACY_URL && <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}><Text style={styles.footerLink}>Privacidad</Text></TouchableOpacity>}
            {!!TERMS_URL && <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}><Text style={styles.footerLink}>Términos</Text></TouchableOpacity>}
            <Text style={styles.footerText}>© Entresueños</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  scroll: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  inner: { width: '100%', maxWidth: 1080 },

  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.lg },
  mark: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  markDot: { width: 32, height: 32, borderRadius: borderRadius.full, backgroundColor: colors.background.card, alignItems: 'center', justifyContent: 'center' },
  markText: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text.primary },
  ghostBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.background.elevated },
  ghostBtnText: { color: colors.text.primary, fontWeight: '600', fontSize: fontSize.sm },

  hero: { alignItems: 'center', paddingVertical: spacing.xl },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: 'rgba(242,204,143,0.10)', borderWidth: 1, borderColor: 'rgba(242,204,143,0.22)', paddingVertical: 6, paddingHorizontal: spacing.md, borderRadius: borderRadius.full },
  eyebrowText: { color: colors.accent.gold, fontWeight: '700', fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase' },
  h1: { fontSize: fontSize.hero + 16, fontWeight: '800', color: colors.text.primary, marginTop: spacing.md, letterSpacing: -1 },
  tagline: { color: colors.accent.gold, fontWeight: '700', fontSize: fontSize.lg, marginTop: spacing.sm, textAlign: 'center' },
  lede: { color: colors.text.secondary, fontSize: fontSize.md, textAlign: 'center', lineHeight: 25, marginTop: spacing.md, maxWidth: 560 },
  ctaRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md, marginTop: spacing.xl },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.accent.terracotta, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: borderRadius.md },
  primaryBtnText: { fontSize: fontSize.md, fontWeight: '700', color: '#23140f' },
  secondaryBtn: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.background.elevated },
  secondaryBtnText: { fontSize: fontSize.md, fontWeight: '600', color: colors.text.primary },
  reassure: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.lg },
  reassureText: { color: colors.text.muted, fontSize: fontSize.sm },

  feat: { paddingVertical: spacing.xxl, gap: spacing.xl },
  featWide: { flexDirection: 'row', alignItems: 'center', gap: 48 },
  col: { alignItems: 'flex-start' },
  colFlex: { flex: 1 },
  // Narrow: parent column stretches this full-width; wide: colFlex makes it share the row 50/50.
  // (No width:'100%' — in RN Web flexShrink defaults to 0, so 100% would starve the copy column.)
  artCol: { alignItems: 'center' },
  kicker: { color: colors.accent.sage, fontWeight: '800', fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase' },
  h2: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text.primary, marginTop: spacing.sm, letterSpacing: -0.4 },
  copyP: { color: colors.text.secondary, fontSize: fontSize.md, marginTop: spacing.md, lineHeight: 25, maxWidth: 440 },
  bullets: { marginTop: spacing.md, gap: spacing.sm },
  bulletRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  bulletText: { color: colors.text.primary, fontSize: fontSize.sm, flex: 1, lineHeight: 21 },

  // Phone
  phone: { width: 288, backgroundColor: '#0b1220', borderRadius: 40, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 24 }, shadowOpacity: 0.5, shadowRadius: 40, elevation: 12 },
  screen: { backgroundColor: colors.background.primary, borderRadius: 30, overflow: 'hidden', height: 580 },
  notch: { height: 26, alignItems: 'center', justifyContent: 'center' },
  notchBar: { width: 92, height: 6, borderRadius: 99, backgroundColor: '#0b1220' },
  sc: { flex: 1, paddingHorizontal: 16, paddingBottom: 8 },
  scH: { fontSize: 19, fontWeight: '800', color: colors.text.primary },
  scSub: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
  commbar: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.background.card, borderRadius: 14, padding: 10, marginTop: 12 },
  commText: { fontSize: 11, color: colors.text.secondary, flex: 1 },
  prompt: { fontSize: 18, fontWeight: '800', color: colors.text.primary, textAlign: 'center' },
  promptSub: { fontSize: 12, color: colors.text.secondary, textAlign: 'center', marginTop: 6 },
  checkcard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.background.card, borderRadius: 14, padding: 12, marginTop: 18 },
  checkcardText: { flex: 1, fontWeight: '600', fontSize: 13, color: colors.text.primary },
  panic: { backgroundColor: colors.accent.terracotta, borderRadius: 20, padding: 14, alignItems: 'center', marginTop: 8 },
  panicT: { fontWeight: '800', fontSize: 18, color: '#23140f', marginTop: 2 },
  panicS: { fontSize: 11, color: '#3a2016', marginTop: 1 },
  tabbar: { height: 50, backgroundColor: colors.background.secondary, borderTopWidth: 1, borderTopColor: colors.background.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },

  chip: { backgroundColor: colors.background.card, borderRadius: 12, padding: 10 },
  chipText: { fontSize: 12, color: colors.text.secondary },
  today: { backgroundColor: colors.background.card, borderRadius: 16, padding: 14, marginTop: 12 },
  todayHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  todayTitle: { fontWeight: '700', fontSize: 13.5, color: colors.text.primary },
  miniRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  miniText: { fontSize: 12.5, color: colors.text.secondary },
  aisum: { backgroundColor: colors.background.elevated, borderLeftWidth: 3, borderLeftColor: colors.accent.sage, borderRadius: 10, padding: 10, marginTop: 12 },
  aisumLabel: { color: colors.accent.sage, fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 },
  aisumText: { fontSize: 11.5, color: colors.text.secondary, lineHeight: 16 },

  bubble: { maxWidth: '84%', paddingVertical: 9, paddingHorizontal: 12, borderRadius: 16 },
  bMe: { alignSelf: 'flex-end', backgroundColor: colors.accent.sage, borderBottomRightRadius: 5 },
  bMeText: { fontSize: 12.5, color: '#0e1a14', lineHeight: 17 },
  bThem: { alignSelf: 'flex-start', backgroundColor: colors.background.card, borderBottomLeftRadius: 5 },
  bThemText: { fontSize: 12.5, color: colors.text.primary, lineHeight: 17 },
  bName: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  bNameText: { fontSize: 9.5, fontWeight: '700', color: colors.accent.terracotta },
  chatInput: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.background.card },
  chatField: { flex: 1, backgroundColor: colors.background.card, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 12 },
  chatFieldText: { fontSize: 12, color: colors.text.muted },
  sendBtn: { width: 34, height: 34, borderRadius: 99, backgroundColor: colors.accent.sage, alignItems: 'center', justifyContent: 'center' },

  moodRow: { flexDirection: 'row', gap: 10, marginTop: 18, paddingHorizontal: 4 },
  mood: { flex: 1, backgroundColor: colors.background.card, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  moodSel: { backgroundColor: 'rgba(129,178,154,0.18)', borderWidth: 1, borderColor: colors.accent.sage },
  moodE: { fontSize: 26 },
  moodL: { fontSize: 11, color: colors.text.secondary, marginTop: 4 },

  statsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  stat: { flex: 1, backgroundColor: colors.background.card, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  statN: { fontSize: 20, fontWeight: '800' },
  statK: { fontSize: 10, color: colors.text.secondary },
  coachLabel: { fontSize: 12.5, fontWeight: '700', color: colors.text.secondary, marginTop: 16 },
  client: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.background.card, borderRadius: 12, padding: 10, marginTop: 10 },
  av: { width: 34, height: 34, borderRadius: 99, backgroundColor: colors.background.elevated, alignItems: 'center', justifyContent: 'center' },
  clientName: { fontWeight: '700', fontSize: 13, color: colors.text.primary },
  clientMeta: { fontSize: 11, color: colors.text.muted },
  badge: { backgroundColor: colors.accent.terracotta, borderRadius: 99, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#23140f' },

  closing: { alignItems: 'center', paddingTop: spacing.xxl, paddingBottom: spacing.xl },
  closingTitle: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text.primary, textAlign: 'center', marginBottom: spacing.sm },
  closingText: { color: colors.text.secondary, fontSize: fontSize.md, textAlign: 'center', marginBottom: spacing.lg, maxWidth: 460 },

  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingTop: spacing.lg, marginTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.background.card },
  footerLink: { fontSize: fontSize.sm, color: colors.text.secondary, textDecorationLine: 'underline' },
  footerText: { fontSize: fontSize.sm, color: colors.text.muted },
});
