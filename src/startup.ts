import { container } from 'tsyringe';
import pino from 'pino';
import {registerCommandHandler, registerEventHandler} from "./cqrs/base/cqrs.ts";
import {RepoWatchRequestedEvent, RepoWatchRequestedEventHandler} from "./cqrs/events/RepoWatchRequestedEvent.ts";
import {PublishTextNoteCommand, PublishTextNoteCommandHandler} from "./cqrs/commands/PublishTextNoteCommand.ts";
import { RelayProvider } from './RelayProvider.ts';
import {JobRequestListener} from "./listeners/JobRequestListener.ts";
import IEventListener from "./listeners/IEventListener.ts";
import {JobRequestEvent, JobRequestEventHandler} from "./cqrs/events/JobRequestEvent.ts";
import {WatchRepositoryCommand, WatchRepositoryCommandHandler} from "./cqrs/commands/WatchRepositoryCommand.ts";
import {GitPatchEvent, GitPatchEventHandler} from "./cqrs/events/GitPatchEvent.ts";

export async function startup() {
    const logger = pino();
    logger.info("Running startup");

    container.registerInstance("Logger", logger);
    container.register(RelayProvider.name, { useClass: RelayProvider });

    // CQRS registrations
    registerEventHandler(RepoWatchRequestedEvent.name, RepoWatchRequestedEventHandler);
    registerEventHandler(JobRequestEvent.name, JobRequestEventHandler);
    registerEventHandler(JobRequestEvent.name, JobRequestEventHandler);
    registerEventHandler(GitPatchEvent.name, GitPatchEventHandler);

    registerCommandHandler(PublishTextNoteCommand.name, PublishTextNoteCommandHandler)
    registerCommandHandler(WatchRepositoryCommand.name, WatchRepositoryCommandHandler)

    // Listeners
    container.register(JobRequestListener.name, { useClass: JobRequestListener });

    logger.info("All services registered");

    const dvmRequestListener: IEventListener = container.resolve(JobRequestListener.name);
    await dvmRequestListener.run();

    logger.info("Startup completed");
}