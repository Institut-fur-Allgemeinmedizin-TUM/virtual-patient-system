const caseImages: Record<string, number> = {
  'emin_yilmaz.png': require('@/assets/images/patients/emin_yilmaz.png'),
  'johann_huber.png': require('@/assets/images/patients/johann_huber.png'),
  'karin_seidel.png': require('@/assets/images/patients/karin_seidel.png'),
  'michael_bauer.png': require('@/assets/images/patients/michael_bauer.png'),
  'peter_lenz.png': require('@/assets/images/patients/peter_lenz.png'),
  'sandra_mueller.png': require('@/assets/images/patients/sandra_mueller.png'),
  'thomas_friedrich.png': require('@/assets/images/patients/thomas_friedrich.png'),
};

export const getCaseImage = (imageName: string) =>
  caseImages[imageName] ?? require('@/assets/images/react-logo.png');

export class Case {
  id: string;
  imageName: string;
  title: string;
  patientName: string;
  patientAge: number;
  patientOccupation: string;

  constructor({
    id,
    patientName,
    title,
    patientAge,
    patientOccupation,
  }: {
    id: string;
    patientName: string;
    title: string;
    patientAge: number;
    patientOccupation: string;
  }) {
    this.id = id;
    this.patientName = patientName;
    this.patientAge = patientAge;
    this.patientOccupation = patientOccupation;
    this.title = title;
    this.imageName =
      patientName
        .toLocaleLowerCase()
        .replaceAll('frau ', '')
        .replaceAll('herr ', '')
        .replaceAll('ä', 'ae')
        .replaceAll('ö', 'oe')
        .replaceAll('ü', 'ue')
        .replace(/\s/g, '_') + '.png';
  }
}
