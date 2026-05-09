/**
 * TypewriterEffectSmooth — from AI Component 1.txt
 * Adapted: TypeScript → JS, Tailwind → inline styles, framer-motion
 */
import { motion } from 'framer-motion';

export const TypewriterEffectSmooth = ({ words = [] }) => {
  const wordsArray = words.map(w => ({ ...w, chars: w.text.split('') }));

  const renderWords = () =>
    wordsArray.map((word, idx) => (
      <span key={idx} style={{ display: 'inline-block' }}>
        {word.chars.map((char, i) => (
          <span
            key={i}
            style={{ color: word.color || 'inherit', fontWeight: 'inherit' }}
          >
            {char}
          </span>
        ))}
        {idx < wordsArray.length - 1 ? '\u00a0' : ''}
      </span>
    ));

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
      <motion.div
        style={{ overflow: 'hidden' }}
        initial={{ width: 0 }}
        whileInView={{ width: 'fit-content' }}
        viewport={{ once: true }}
        transition={{ duration: 2.2, ease: 'linear', delay: 0.4 }}
      >
        <div style={{ whiteSpace: 'nowrap', fontWeight: 800, fontSize: 'inherit' }}>
          {renderWords()}
        </div>
      </motion.div>

      {/* Blinking cursor */}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
        style={{
          display: 'inline-block',
          width: 3,
          height: '0.75em',
          borderRadius: 2,
          background: '#00ffc8',
          flexShrink: 0,
          verticalAlign: 'middle',
        }}
      />
    </div>
  );
};

export default TypewriterEffectSmooth;
