import { AppAction } from "./appActions"

export type AppReducerValues = {
    eanCode: string,
    error: string
}

export type AppActions = {
    type: AppAction,
    payload: string
}