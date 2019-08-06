import { CompositeRouteProvider } from '@symbiotic/express-router-adapter';
import { PetRouter } from './pets/PetRouter';

export class ApplicationRouteProvider extends CompositeRouteProvider {
  static inject: any[] = [
    PetRouter,
  ];
}
