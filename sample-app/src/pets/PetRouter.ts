import { IHTTPRoute, RouterMetaBuilder } from '@symbiotic/express-router-adapter';
import { autoinject } from 'aurelia-dependency-injection';

interface IPet {
  firstName: string;
  lastName: string;
  internalS3PathToPicture: string;
}

class OldPetMediaType {
  mediaType: string = 'application/json';
  formatForResponse({ firstName, lastName }: IPet): any {
    return { name: `${firstName} ${lastName}` };
  }
  formatFromRequest(body: any): any {
    const { name } = body;
    return { firstName: name, lastName: '' };
  }
}

// tslint:disable-next-line: max-classes-per-file
class PetMediaType {
  mediaType: string = 'application/pet+json';
  formatForResponse({ firstName, lastName }: IPet): any {
    return { firstName, lastName };
  }
  formatFromRequest(body: any): any {
    const { firstName, lastName } = body;
    return { firstName, lastName };
  }
}

// tslint:disable-next-line: max-classes-per-file
@autoinject
class PetsMediaType {
  constructor(private petMediaType: PetMediaType) {}
  mediaType: string = 'application/pets+json';
  formatForResponse(pets: IPet[]): any {
    return pets.map(this.petMediaType.formatForResponse);
  }
  formatFromRequest(): void {
    throw new Error('not supported');
  }
}

// tslint:disable-next-line: max-classes-per-file
@autoinject
export class PetRouter {
  constructor(private petMediaType: PetMediaType, private oldPetMediaType: OldPetMediaType, private petsMediaType: PetsMediaType) {}
  pets: IPet[] = [
    { firstName: 'honey', lastName: 'hoguet', internalS3PathToPicture: '...' },
    { firstName: 'poseidon', lastName: 'hoguet', internalS3PathToPicture: '...' }
  ];
  getRoutes(): IHTTPRoute[] {
    return [
      new RouterMetaBuilder()
        .path('/pets/')
        .mediaType(this.petsMediaType)
        .get(() => {
          return this.pets;
        }),

      new RouterMetaBuilder()
        .path('/pets/')
        .allowAnonymous()
        .mediaType(this.petsMediaType)
        .post(({ model }) => {
          // intentionally empty
      }),
      new RouterMetaBuilder()
        .path('/pets/:petId')
        .mediaType(this.oldPetMediaType)
        .mediaType(this.petMediaType)
        .allowAnonymous()
        .get(({ petId }) => {
          return this.pets[petId];
        })
    ];
  }
}
