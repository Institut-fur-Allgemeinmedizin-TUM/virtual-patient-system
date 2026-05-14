import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Realistic Virtual Patients',
    Svg: require('@site/static/img/education.svg').default,
    description: (
      <>
        Interactive, case-based virtual patients that help medical students
        practice anamnesis, clinical reasoning, and decision-making.
      </>
    ),
  },
  {
    title: 'Clinical Skills Training',
    Svg: require('@site/static/img/education.svg').default,
    description: (
      <>
        Focus on core educational goals: build clinical scenarios, track
        progress and enhance anamnesis skills.
      </>
    ),
  },
  {
    title: 'Designed for Education',
    Svg: require('@site/static/img/education.svg').default,
    description: (
      <>
        Built with modern web tooling to be extensible, accessible, and ready
        for classroom use or research projects at TUM.
      </>
    ),
  },
];

function Feature({title, Svg, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
