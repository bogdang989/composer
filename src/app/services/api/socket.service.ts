import {Observable} from "rxjs/Observable";
import {Inject, Injectable} from "@angular/core";
import "rxjs/add/operator/share";
import {SocketMessage} from "./socket-message";
import {AppConfig, APP_CONFIG} from "../../config/app.config";
import {SOCKET_EVENTS} from "./socket-events";
import {Observer} from "rxjs/Observer";
import Socket = SocketIOClient.Socket;


@Injectable()
export class SocketService {

    private ioSocket: Socket;
    private connection: Observable<SocketMessage>;

    private connectionTimeout = 10000;


    constructor(@Inject(APP_CONFIG) private config: AppConfig) {

        let host      = `http://${config.hostname}:${config.port}`;
        this.connection = this.createConnectionStream(host);
    }

    public getDataStream(): Observable<SocketMessage> {
        return this.connection;
    }

    public request(eventName: string, data?: any = {}): Observable<any> {

        let sub = this.connection.startWith("Start").subscribe(_ => true);

        return Observable.create((obs: Observer)=> {
            this.ioSocket.emit(eventName, data, (data)=> {
                if (data.error) {
                    obs.error(data);
                } else {
                    obs.next(data);
                }
                obs.complete();

                setTimeout(function () {
                    sub.unsubscribe();
                }, this.connectionTimeout);
            });
        });
    }

    private createConnectionStream(host: string): Observable<any> {
        return Observable.create((observer: Observer) => {

            this.ioSocket = io(host);

            this.ioSocket.on("connect", () => {
                console.log("Socket Connection Established");
            });

            for (let eventName in SOCKET_EVENTS) {
                this.ioSocket.on(SOCKET_EVENTS[eventName], () => {
                    observer.next(new SocketMessage(eventName, {}));
                });
            }

            return () => {
                console.log("Closing Socket Connection");
                this.ioSocket.close();
            }
        }).share();
    }
}
