import {container, Lifecycle} from "tsyringe";
import type {constructor} from "tsyringe/dist/typings/types";
import IQueryHandler from './IQueryHandler.ts';
import IEventHandler from './IEventHandler.ts';
import ICommandHandler from './ICommandHandler.ts';


export function registerCommandHandler(commandName: string, classToUse: constructor<ICommandHandler<any>>){
    container.register(`ICommandHandler<${commandName}>`, {
        useClass: classToUse
    });
}

export function registerQueryHandler(queryName: string, classToUse: constructor<IQueryHandler<any, any>>){
    container.register(`IQueryHandler<${queryName}>`, {
        useClass: classToUse
    });
}
export function registerQueryHandlerSingleton(queryName: string, classToUse: constructor<IQueryHandler<any, any>>){
    container.register(`IQueryHandler<${queryName}>`, {
        useClass: classToUse
    }, { lifecycle: Lifecycle.Singleton });
}

export function registerEventHandler(eventName: string, classToUse: constructor<IEventHandler<any>>){
    container.register(`IEventHandler<${eventName}>`, {
        useClass: classToUse
    });
}

//////////////////////////////////////////
/*          Resolving                   */
//////////////////////////////////////////
export function resolveCommandHandler(commandName: string): ICommandHandler<any>{
    return container.resolve(`ICommandHandler<${commandName}>`);
}

export function resolveQueryHandler(queryName: string): IQueryHandler<any, any>{
    return container.resolve(`IQueryHandler<${queryName}>`);
}

export function resolveEventHandler(eventName: string): IEventHandler<any>{
    return container.resolve(`IEventHandler<${eventName}>`);
}