import { createContext, useContext, useReducer, ReactNode, Dispatch } from "react";
import { AppReducerValues, AppActions } from "./types";
import { appReducer } from "./appReducer"
interface Props {
  children: ReactNode
}
const initialState: AppReducerValues = {
  eanCode: '',
  error: ''
}

export const GlobalContext = createContext<[AppReducerValues, Dispatch<AppActions>]>([initialState, () => { }])
// export const Attendance = createContext<Student>({studentData: {}})

export const useGlobalContext = () => useContext(GlobalContext)[0]
export const useGlobalContextDispatch = () => useContext(GlobalContext)[1]

export const GlobalContextProvider = ({ children }: Props) => {

  return (
    <GlobalContext.Provider value={useReducer(appReducer, initialState)}>
      {children}
    </GlobalContext.Provider>
  )
}