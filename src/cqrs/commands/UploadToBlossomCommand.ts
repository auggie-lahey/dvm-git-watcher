import {inject, injectable} from "tsyringe";
import type pino from "pino";
import ICommand from "../base/ICommand.ts";
import ICommandHandler from '../base/ICommandHandler.ts';
import { BlossomUploader } from '@nostrify/nostrify/uploaders';
import {NSecSigner} from '@nostrify/nostrify';
import * as path from "jsr:@std/path";


export class UploadToBlossomCommand implements ICommand {
    filePath!: string
}

@injectable()
export class UploadToBlossomCommandHandler implements ICommandHandler<UploadToBlossomCommand> {

    constructor(
        @inject("Logger") private logger: pino.Logger,
    ) {
    }

    async execute(command: UploadToBlossomCommand): Promise<void> {
        this.logger.info(`Uploading file ${command.filePath} to Blossom`);

        const secretKey: string = Deno.env.get("NSEC_HEX") || ""; // TODO throw new Error("NSEC_HEX env var not set");
        const signer = new NSecSigner(secretKey);

        const uploader = new BlossomUploader({
            servers: ['https://cdn.satellite.earth'],
            signer: signer,
        });

        // const fileName = path.basename(command.filePath);
        const fullFilePath = `file:/${Deno.cwd()}/${command.filePath}`;
        const data = await Deno.readFile(command.filePath);
        const blob = new Blob([data], {type: 'application/x-tar'});
        const file = new File([blob], 'bla.tar', { type: 'application/x-tar' });

        try{

            const tags = await uploader.upload(file);

            console.log(tags)
        } catch (e) {
            console.log(e)
        }

    }
}