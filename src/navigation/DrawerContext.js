import { createContext, useContext } from 'react'

export const DrawerContext = createContext({ openMenu: () => {} })
export const useDrawer = () => useContext(DrawerContext)
