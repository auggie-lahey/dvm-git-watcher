import IQuery from "./IQuery.ts";

export default interface IQueryHandler<TQuery extends IQuery<TResult>, TResult> {
    query(query: TQuery): Promise<TResult>;
}
