export class Case {
    id: string;
    patientName: string
    imageName: string;


    constructor({ id, patientName }: { id: string; patientName: string }) {
        this.id = id;
        this.patientName = patientName;

        this.imageName = patientName.toLocaleLowerCase()
        
        .replaceAll("frau ", "")
        .replaceAll("herr ", "")
        .replaceAll("ä", "ae")
        .replaceAll("ö", "oe")
        .replaceAll("ü", "ue")
        .replace(/\s/g, '_') + ".png";

    }
}
