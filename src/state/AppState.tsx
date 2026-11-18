import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { buildSampleAnalysis, type Analysis, type Athlete } from "../domain";
import { daysAgo } from "../format";
import { uid } from "../ids";
import { emptyDatabase, loadDatabase, saveDatabase, type Database } from "../storage/repository";

type AppState = {
  ready: boolean;
  error: string | null;
  athletes: Athlete[];
  analyses: Analysis[];
  addAthlete: (name: string, note: string) => Athlete;
  updateAthlete: (id: string, patch: Partial<Pick<Athlete, "name" | "note">>) => void;
  deleteAthlete: (id: string) => void;
  addAnalysis: (analysis: Analysis) => void;
  updateAnalysis: (analysis: Analysis) => void;
  deleteAnalysis: (id: string) => void;
  loadSampleGroup: () => Athlete;
};

const Context = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<Database>(emptyDatabase());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadDatabase()
      .then((loaded) => {
        if (cancelled) return;
        setDb(loaded);
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setError("The team sheet on this phone could not be opened.");
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const commit = useCallback((next: Database) => {
    setDb(next);
    void saveDatabase(next).catch(() => {
      setError("A change could not be saved on this phone.");
    });
  }, []);

  const value = useMemo<AppState>(() => {
    return {
      ready,
      error,
      athletes: db.athletes,
      analyses: db.analyses,
      addAthlete: (name, note) => {
        const athlete: Athlete = {
          id: uid("athlete"),
          name: name.trim(),
          note: note.trim(),
          createdAt: new Date().toISOString(),
        };
        commit({ ...db, athletes: [athlete, ...db.athletes] });
        return athlete;
      },
      updateAthlete: (id, patch) => {
        commit({
          ...db,
          athletes: db.athletes.map((athlete) => (athlete.id === id ? { ...athlete, ...patch } : athlete)),
        });
      },
      deleteAthlete: (id) => {
        commit({
          athletes: db.athletes.filter((athlete) => athlete.id !== id),
          analyses: db.analyses.filter((analysis) => analysis.athleteId !== id),
          version: 1,
        });
      },
      addAnalysis: (analysis) => {
        commit({ ...db, analyses: [analysis, ...db.analyses] });
      },
      updateAnalysis: (analysis) => {
        commit({
          ...db,
          analyses: db.analyses.map((item) => (item.id === analysis.id ? analysis : item)),
        });
      },
      deleteAnalysis: (id) => {
        commit({ ...db, analyses: db.analyses.filter((analysis) => analysis.id !== id) });
      },
      loadSampleGroup: () => {
        const existing = db.athletes.filter((athlete) => athlete.name.startsWith("Alex Rivera")).length;
        const athlete: Athlete = {
          id: uid("athlete"),
          name: existing === 0 ? "Alex Rivera" : `Alex Rivera ${existing + 1}`,
          note: "Training group · PB 5.92m",
          createdAt: daysAgo(20),
        };
        const analyses = [
          buildSampleAnalysis(athlete.id, "soft-knee", daysAgo(16)),
          buildSampleAnalysis(athlete.id, "no-drop", daysAgo(9)),
          buildSampleAnalysis(athlete.id, "flat", daysAgo(4)),
          buildSampleAnalysis(athlete.id, "balanced", new Date().toISOString()),
        ];
        commit({
          version: 1,
          athletes: [athlete, ...db.athletes],
          analyses: [...analyses, ...db.analyses],
        });
        return athlete;
      },
    };
  }, [commit, db, error, ready]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAppState(): AppState {
  const value = useContext(Context);
  if (!value) throw new Error("useAppState must be used inside AppStateProvider");
  return value;
}
