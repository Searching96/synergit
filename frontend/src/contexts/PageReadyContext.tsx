/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface PageReadyContextType {
  isPageReady: boolean;
  setPageReady: (ready: boolean) => void;
}

const PageReadyContext = createContext<PageReadyContextType>({
  isPageReady: false,
  setPageReady: () => {},
});

export const PageReadyProvider = ({ children }: { children: ReactNode }) => {
  const [isPageReady, setPageReady] = useState(false);

  return (
    <PageReadyContext.Provider value={{ isPageReady, setPageReady }}>
      {children}
    </PageReadyContext.Provider>
  );
};

export const usePageReady = () => useContext(PageReadyContext);

export const useSetPageReady = (ready: boolean) => {
  const { setPageReady } = usePageReady();

  useEffect(() => {
    setPageReady(ready);
    return () => setPageReady(false);
  }, [ready, setPageReady]);
};
