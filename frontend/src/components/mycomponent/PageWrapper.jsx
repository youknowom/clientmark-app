import { motion } from 'framer-motion'

const variants = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -15 },
}

const transition = {
  duration: 0.3,
  ease: 'easeInOut',
}

export default function PageWrapper({ children }) {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transition}
      style={{ height: '100%' }}
    >
      {children}
    </motion.div>
  )
}
