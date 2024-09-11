export default interface IEventListener {

    run(): Promise<void>;
}