type Partial<T> = {
    [P in keyof T]?: T[P];
};

type PartialHTTPResponse = Partial<HTTPResponse>;

export class HTTPResponse {
    status: number;
    headers: { [key: string]: string } = {};
    isHTTPResponse: boolean = true;
    body: any;

    constructor(properties: PartialHTTPResponse) {
        Object.assign(this, properties);
    }
}
