import { useEffect, useState } from "react";

import {
  fetchResources,
  RESOURCE_TYPES,
  type Resource,
  type ResourceType,
} from "../api/campushubApi";
import styles from "./ResourceList.module.css";

export interface ResourceListProps {
  selectedResourceId?: string;
  onSelectResource: (resource: Resource) => void;
}

type ResourceFilter = "ALL" | ResourceType;

const typeLabels: Record<ResourceType, string> = {
  ROOM: "Study room",
  EQUIPMENT: "Equipment",
  LAB: "Lab",
};

export function ResourceList({
  selectedResourceId,
  onSelectResource,
}: ResourceListProps) {
  const [filter, setFilter] = useState<ResourceFilter>("ALL");
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadResources(): Promise<void> {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetchResources(filter === "ALL" ? undefined : filter);
        if (isCurrent) {
          setResources(result);
        }
      } catch (loadError: unknown) {
        if (isCurrent) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load campus resources.",
          );
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    void loadResources();
    return () => {
      isCurrent = false;
    };
  }, [filter]);

  return (
    <section className={styles.section} aria-labelledby="resources-heading">
      <div className={styles.headingRow}>
        <div>
          <p className={styles.eyebrow}>Explore campus</p>
          <h2 id="resources-heading">Resource directory</h2>
        </div>
        <label className={styles.filter}>
          <span>Resource type</span>
          <select
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as ResourceFilter)
            }
          >
            <option value="ALL">All resources</option>
            {RESOURCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {typeLabels[type]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading && <p className={styles.state}>Loading resources…</p>}
      {error && (
        <div className="alert alertError" role="alert">
          {error}
        </div>
      )}
      {!isLoading && !error && resources.length === 0 && (
        <p className={styles.state}>No resources match this filter.</p>
      )}

      <div className={styles.grid} aria-live="polite">
        {resources.map((resource) => {
          const isSelected = resource.id === selectedResourceId;
          return (
            <article
              className={`${styles.card} ${isSelected ? styles.selected : ""}`}
              key={resource.id}
            >
              <div className={styles.cardTop}>
                <span className={styles.type}>{typeLabels[resource.type]}</span>
                <span
                  className={
                    resource.isAvailable ? styles.available : styles.unavailable
                  }
                >
                  {resource.isAvailable ? "Available" : "Unavailable"}
                </span>
              </div>
              <h3>{resource.name}</h3>
              <p>{resource.location}</p>
              <button
                type="button"
                disabled={!resource.isAvailable}
                onClick={() => onSelectResource(resource)}
              >
                {isSelected ? "Selected" : "Reserve"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
