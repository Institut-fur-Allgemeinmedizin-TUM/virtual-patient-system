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
