import { ISecurityContext } from './ISecurityContext';

export interface ISecurityContextProvider {
    getSecurityContext({ req: any }: any): Promise<ISecurityContext>;
}
