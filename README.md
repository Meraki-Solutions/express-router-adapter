# ExpressRouterAdapter

ExpressRouterAdapter is a library that makes it easy to build evolvable hypermedia APIs using the express framework.

## Installation

ExpressRouterAdapter is available as a package on NPM for use with a module bundler.

```shell
npm install --save @symbiotic/express-router-adapter
```

The core imports
```ts
import {
  CompositeRouteProvider,
  RouteProvider,
  RouterMetaBuilder,
  HTTPError,
  HTTPResponse,
  SecurityContextProvider,
  ISecurityContext,
  ExpressRouterAdapter
} from '@symbiotic/express-router-adapter';
```

## Getting started

ExpressRouterAdapter enhances express, so lets start with a simple express app. This is not a deep dive intro express, see [express documentation](https://expressjs.com/).

```js

const app = express();

app.get('/pets/:petId', (req, res) => {
  res.json({ petId: req.params.petId, name: 'Sawyer '});
});

app.listen(4000);

```

Lets install ExpressRouterAdapter. We are using IOC in our examples, so we are also installing `aurelia-dependency-inject` (and it's dependency `reflect-metadata`), but you could new up all the classes yourself if you choose, in which case you only need to install `@symbiotic/express-router-adapter`.

```shell
npm install --save @symbiotic/express-router-adapter aurelia-dependency-injection reflect-metadata
```

Now we can add ExpressRouterAdapter and refactor to use RouterMetaBuilder to define our routes.

```js
import 'reflect-metadata'; // polyfill for aurelia-dependency-injection
import express from 'express';
import {
  ExpressRouterAdapter,
  RouterMetaBuilder,
  RouteProvider
} from '@symbiotic/express-router-adapter';
import { Container } from 'aurelia-dependency-injection';

const container = new Container();

class PetRouter{
  getRoutes(){
    return [
      new RouterMetaBuilder()
        .path('/pets/:petId')
        .allowAnonymous()
        .get(({ petId }) => {
          return { petId, name: 'Sawyer '};
        })
    ];
  }
}
container.registerAlias(PetRouter, RouteProvider);

const app = express();
container.get(ExpressRouterAdapter).applyRoutes(app);
app.listen(4000);
```

> Note: Routers must implement a `getRoutes` method that returns an array of routes.

### What if I have more than one router?

We expose a `CompositeRouteProvider` to save you from building the composite yourself.

```js
import { CompositeRouteProvider, RouteProvider } from '@symbiotic/express-router-adapter';
import { Container } from 'aurelia-dependency-injection';
import { Router1, Router2 } from '.';

class AppRouter extends CompositeRouteProvider {
  static inject = [Router1, Router2];
};
container.registerAlias(AppRouter, RouteProvider);
```

## How do I get access to a query param?

```js

class PetRouter{
  getRoutes(){
    return [
      new RouterMetaBuilder()
        .path('/pets/:petId')
        .query('petName')
        .get(({ petId, petName }) => {
          // ...
        })
    ];
  }
}
```

You can always get to the raw express request if you need to as well. And then you don't need to use the `query` method on `RouterMetaBuilder`.

```js

class PetRouter{
  getRoutes(){
    return [
      new RouterMetaBuilder()
        .path('/pets/:petId')
        .allowAnonymous()
        .get(({ petId, req }) => {
          // req.query.petType
        })
    ];
  }
}
```

## What if my route handler doesn't return anything
```js

class PetRouter{
  getRoutes(){
    return [
      new RouterMetaBuilder()
        .path('/pets/:petId')
        .allowAnonymous()
        .put(({ petId, body }) => {
          // return nothing
        })
    ];
  }
}
```

Then you will automatically get a 204.


## What if it does return something?

```js

class PetRouter{
  getRoutes(){
    return [
      new RouterMetaBuilder()
        .path('/pets/:petId')
        .allowAnonymous()
        .put(({ petId }) => {
          return { petId, name: 'honey' }
        })
    ];
  }
}
```


Then you will automatically get a 200 with your model serialized as JSON and a content-type header of application/json.

## What if I need do something asynchronous

```js

class PetRouter{
  getRoutes(){
    return [
      new RouterMetaBuilder()
        .path('/pets/:petId')
        .allowAnonymous()
        .put(async ({ petId }) => {
          await doSomethingAsync(petId);
        })
    ];
  }
}
```



## What if I throw an exception
```js
class PetRouter{
  getRoutes(){
    return [
      new RouterMetaBuilder()
        .path('/pets/:petId')
        .allowAnonymous()
        .put(async ({ petId }) => {
          throw new Error(`there be gremlins`);
        })
    ];
  }
}
```
then it will bubble to the express middleware to your error handler. If you haven't sent one up, here is an example.

```js
app.use(err: any, req: any, res: any, next: any): void {
  const {
    status = 500,
    message = 'Server Error'
  } = err;
  if (status >= 500) {
    console.log('failed to process request', req.method, req.path);
    console.error('error handler error', err);
  }

  let body = err.body || {
      status,
      message
  };

  res.status(status)
    .json(body);
}

```

## What if I want more control over the status code or headers

 ```js
import { HTTPResponse, RouterMetaBuilder } from '@symbiotic/express-router-adapter';

class PetRouter{
  getRoutes(){
    return [
      new RouterMetaBuilder()
        .path('/pets/:petId')
        .allowAnonymous()
        .put(async ({ petId }) => {
          return new HTTPResponse({
            status: 400,
            headers: {
              'x-custom-header': 'My custom header.',
            },
            body: {
              message: `pet was missing name`,
              code: 123
            }
          });
        })
    ];
  }
}
```

You also can throw

```js
import { HTTPError, RouterMetaBuilder } from '@symbiotic/express-router-adapter';

class PetRouter{
  getRoutes(){
    return [
      new RouterMetaBuilder()
        .path('/pets/:petId')
        .allowAnonymous()
        .put(async ({ petId }) => {
          throw new HTTPError({
            message: `pet validation failed`,
            status: 400,
            headers: {
              'x-custom-header': 'My custom header.',
            },
            body: {
              message: `pet was missing name`,
              code: 123
            }
          });
        })
    ];
  }
}
```

Which is convenient as you abstract things away, so you can end up with code like

```js
import { RouterMetaBuilder } from '@symbiotic/express-router-adapter';

class PetRouter{
  getRoutes(){
    return [
      new RouterMetaBuilder()
        .path('/pets/:petId')
        .allowAnonymous()
        .put(async ({ body }) => {
          validateCreatePet(body);
          // proceed to create the pet
        })
    ];
  }
}
```


## Can I have more than one media type on a resource?
Yes, in fact this is one of the primary motivations behind express-route-adapter is to make that easy.

In previous examples, we aren't specifying the media type, and so we're getting the default json formatter.

Consider this example

```js
import { IHTTPRoute, RouterMetaBuilder } from '@symbiotic/express-router-adapter';

interface IPet {
  name: string;
  internalS3PathToPicture: string;
}

export class PetRouter {
  pets: IPet[] = [
    { name: 'honey', internalS3PathToPicture: '...' },
    { name: 'poseidon', internalS3PathToPicture: '...' }
  ];
  getRoutes(): IHTTPRoute[] {
    return [
      new RouterMetaBuilder()
        .path('/pets/:petId')
        .allowAnonymous()
        .get(({ petId }) => {
          return this.pets[petId];
        })
    ];
  }
}
```

Our data model has an internal path that we don't want to leak out.

We can add our own media type to encapsulate this.

```ts
import { IHTTPRoute, RouterMetaBuilder } from '@symbiotic/express-router-adapter';
import { autoinject } from 'aurelia-dependency-injection';

interface IPet {
  name: string;
  internalS3PathToPicture: string;
}

class PetMediaType {
  mediaType: string = 'application/json';
  formatForResponse({ name }: IPet): any {
    return { name };
  }
  formatFromRequest(): void {
    throw new Error('Not implemented');
  }
}

@autoinject
export class PetRouter {
  constructor(private petMediaType: PetMediaType){}
  pets: IPet[] = [
    { name: 'honey', internalS3PathToPicture: '...' },
    { name: 'poseidon', internalS3PathToPicture: '...' }
  ];
  getRoutes(): IHTTPRoute[] {
    return [
      new RouterMetaBuilder()
        .path('/pets/:petId')
        .mediaType(this.petMediaType)
        .allowAnonymous()
        .get(({ petId }) => {
          return this.pets[petId];
        })
    ];
  }
}
```

But now lets imagine we want to make a breaking change, we want to split name into first name and last name. This is easy with media types. Our model will have both properties, and our media types can format correctly so that our old consumers still get name.

```ts
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
  formatFromRequest(): void {
    throw new Error('Not implemented');
  }
}

class PetMediaType {
  mediaType: string = 'application/pet+json';
  formatForResponse({ firstName, lastName }: IPet): any {
    return { firstName, lastName };
  }
  formatFromRequest(): void {
    throw new Error('Not implemented');
  }
}

@autoinject
export class PetRouter {
  constructor(
    private petMediaType: PetMediaType,
    private oldPetMediaType: OldPetMediaType
  ){}
  pets: IPet[] = [
    { firstName: 'honey', lastName: 'hoguet', internalS3PathToPicture: '...' },
    { firstName: 'poseidon', lastName: 'hoguet', internalS3PathToPicture: '...' }
  ];
  getRoutes(): IHTTPRoute[] {
    return [
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

```
so now...
```sh
curl -H accept:application/json  http://localhost:4000/pets/1
{"name":"poseidon hoguet"}
curl -H accept:application/pet+json  http://localhost:4000/pets/1
{"firstName":"poseidon","lastName":"hoguet"}
```

We also can re-use our formatter for formatting lists of pets...

```ts
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
  formatFromRequest(): void {
    throw new Error('Not implemented');
  }
}

class PetMediaType {
  mediaType: string = 'application/pet+json';
  formatForResponse({ firstName, lastName }: IPet): any {
    return { firstName, lastName };
  }
  formatFromRequest(): void {
    throw new Error('Not implemented');
  }
}

@autoinject
class PetsMediaType {
  constructor(private petMediaType: PetMediaType) {}
  mediaType: string = 'application/pets+json';
  formatForResponse(pets: IPet[]): any {
    return pets.map(this.petMediaType.formatForResponse);
  }
  formatFromRequest(): void {
    throw new Error('Not implemented');
  }
}

@autoinject
export class PetRouter {
  constructor(private petMediaType: PetMediaType, private oldPetMediaType: OldPetMediaType, private petsMediaType: PetsMediaType){}
  pets: IPet[] = [
    { firstName: 'honey', lastName: 'hoguet', internalS3PathToPicture: '...' },
    { firstName: 'poseidon', lastName: 'hoguet', internalS3PathToPicture: '...' }
  ];
  getRoutes(): IHTTPRoute[] {
    return [
      new RouterMetaBuilder()
        .path('/pets/')
        .mediaType(this.petsMediaType)
        .allowAnonymous()
        .get(() => {
          return this.pets;
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
```

Once you add a custom media type, only the media types you specify will work (you've opted out of the default application/json). This is a DX issue for consumers of your API and we include a helpful response to help navigate it.

```sh
curl -H 'accept:application/json'  http://localhost:4000/pets/
{
  "status":406,
  "message":"The requested Accept format cannot be satisfied. Try one of the supported media types: application/pets+json"
}
```

> also of note that this doesn't have to be a breaking change, in fact the way we handled `/pets/:petId'` above demonstrated that.

> also of note is that your format methods can be async

So far we have been focused on response formatting (which is the most common use-case), but you also can do formatting on the request.

Consider this example

```ts
new RouterMetaBuilder()
  .path('/pets/')
  .allowAnonymous()
  .post(({ body }) => {

  })
```

What ever is posted will be in body... but maybe I want to whitelist which properties are passed to the handler as the `model` property.

```ts
@autoinject
class postPetMediaType {
  constructor(private petMediaType: PetMediaType) {}
  mediaType: string = 'application/pet+json';
  formatForResponse(): void {
    throw new Error('Not implemented');
  }
  formatFromRequest(body: any): any {
    const { firstName, lastName } = body;
    return { firstName, lastName };
  }
}
// and in my router...
 new RouterMetaBuilder()
    .path('/pets/')
    .allowAnonymous()
    .mediaType(this.petsMediaType)
    .mediaType(this.postPetMediaType)
    .post(({ model }) => {

    })
```

Now, `model` is what we'd expect.

Another example is when we need to make a breaking change...

```ts
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
```

Now I can support the new data structure without breaking the old one, and encourage consumers of the old one to switch. I can then remove very little code, as this adapting happened at the right layer insulating most of my code from it.

> Of note, the second parameter to the format methods is `req` in the rare case you need something raw from the req, eg a query param that is doing column filtering.

## What if I need a different handler based on the media type?
TODO

## What if I need to lock down most of my endpoints?
So far, we haven't done any authorization, lets lock it down.

If we remove allow anonymous, we will start getting a 401
```ts
new RouterMetaBuilder()
  .path('/pets/')
  .mediaType(this.petsMediaType)
  .get(() => {
    return this.pets;
  }),
```

```sh
curl -H 'accept:application/pets+json'  http://localhost:4000/pets/
{"status":401,"message":"Authorization is required"}
```

Security is going to be different for every application, so we provide a hook for you to bring your own security.


```ts

import 'reflect-metadata'; // Required by aurelia-dependency-injection

import {
  ISecurityContext,
  ISecurityContextProvider,
  RouteProvider,
  SecurityContextProvider
} from '@symbiotic/express-router-adapter';
import { Container } from 'aurelia-dependency-injection';
import { ApplicationRouteProvider } from './ApplicationRouteProvider';

class ApplicationSecurityContext implements ISecurityContext {
  constructor(public principal: string) { }
  toLogSafeString(): string {
    return this.principal;
  }
}

class ApplicationSecurityContextProvider implements ISecurityContextProvider {
  async getSecurityContext({ req }: any): Promise<ApplicationSecurityContext> {
    const authHeader = req.headers.authorization;
    // this is NOT real security
    return new ApplicationSecurityContext(authHeader);
  }

}

export const getContainer = async (): Promise<Container> => {
  const container = new Container();

  container.registerAlias(ApplicationRouteProvider, RouteProvider);
  container.registerAlias(ApplicationSecurityContextProvider, SecurityContextProvider);

  return container;
};
```

Now we get the following
```sh
curl -H 'authorization:jon' -H 'accept:application/pets+json'  http://localhost:4000/pets/
[{"firstName":"honey","lastName":"hoguet"},{"firstName":"poseidon","lastName":"hoguet"}]
```

Which of course isn't secure! But it demonstrates the plumbing.

> Of note: you must have a principal on your security context to not be considered anonymous. You will still get a 401 without a principal property.

## What if I want a base path added?
TODO

## What if I need custom timeouts?
TODO

## How can I provide my own logger?
TODO

## How do I serialize a response when it isn't json
TODO


## Is there a sample app I can reference?

Yes, check out [./sample-app]()

## Motivation
ExpressRouterAdapter was born out of necessity as Symbiotic Labs supported multiple clients building out Restful APIs using Node.

We wanted some basics of REST to be easy / out of the box, so that developers can focus on using REST.
 - You should just be able to return a model and get a JSON response. You shouldn't have to think about 200 (ok), or JSON formatting it.
 - You should be able to NOT return a value from a handler and get a 204 (no content)
 - You should be able to use promises / async
 - You should be able to throw errors, to include errors that can drive status codes
 - It should be easy to add a new media type to an existing handler without needing to mess with the content negotiation or thinking about 406 (not acceptable) and 415 (unsupported media type)

We also were concerned about analysis paralysis with all the great things out there (Express, Koa, Strapi, Hapi, Sails, FeatherJS). We are a lean company that favors something that works an delivers business value quickly, over the perfect solution, eventually.

So we decided that something like RouterMetaBuilder would allow us to describe our rest endpoints in a way that could easily be plugged into any framework, and that this would actually give us the most forward portability (over picking the perfect framework). We chose express to the framework we're using because we have experience with it, it is mature, and it has proven a committment to maintaining a solid low level abstraction (as opposed to trying to handle all possible use cases at the cost of increased complexity, code bloat and being a bad abstraction for the most common use cases).

## Roadmap

 - Reconsider mediaType term for formatters as they are adapters, not media types.
 - Should ERA 401 if SecurityContextProvider returns a SecurityContext with no principal?
 - You should get a 405 (method not allowed) instead of a 404 when hitting a resource that exists but a verb that doesn't

## Credits

Made with :heart: by [Symbiotic Labs](https://www.symbioticlabs.io/)

Powering:
 - [Asure Software](https://www.asuresoftware.com/)
 - [WanderLost Project](https://www.thewanderlostproject.com/)
 - [WildKind](https://wildkind.co/)
