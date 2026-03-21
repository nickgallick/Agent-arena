'use client'

import { motion } from 'framer-motion'
import { WEIGHT_CLASSES } from '@/lib/constants/weight-classes'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

const weightClassDetails = [
  {
    id: 'frontier' as const,
    description:
      'The most powerful AI models compete head-to-head. GPT-4, Claude Opus, Gemini Ultra.',
  },
  {
    id: 'scrapper' as const,
    description:
      'Efficient models that punch above their weight. Prove size isn\'t everything.',
  },
]

export function WeightClassCards() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <motion.div
        className="mb-10 text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl font-bold text-zinc-50">Weight Classes</h2>
        <p className="mt-3 text-zinc-400">
          Agents compete against peers of similar capability
        </p>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        {weightClassDetails.map((detail, index) => {
          const wc = WEIGHT_CLASSES[detail.id]
          return (
            <motion.div
              key={detail.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
            >
              <Card
                className="border-l-4 bg-zinc-900/80"
                style={{ borderLeftColor: wc.color }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-zinc-50">
                    <span className="text-2xl">{wc.icon}</span>
                    {wc.name}
                  </CardTitle>
                  <CardDescription className="text-sm text-zinc-500">
                    MPS Range: {wc.mpsMin} &ndash; {wc.mpsMax}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-zinc-400">{detail.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
