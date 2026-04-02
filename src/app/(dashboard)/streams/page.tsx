"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  getStreams,
  addStream,
  updateStream,
  deleteStream,
  type GAStream,
} from "@/lib/firestore";
import { fetchAccountSummaries } from "@/lib/ga-api";
import { Plus, Search, MoreVertical, X, ExternalLink, Check, RefreshCw } from "lucide-react";

type GAProperty = {
  propertyId: string;
  displayName: string;
  parent: string;
};

function parseProperties(data: any): GAProperty[] {
  const properties: GAProperty[] = [];
  for (const account of data.accountSummaries || []) {
    for (const prop of account.propertySummaries || []) {
      properties.push({
        propertyId: prop.property?.replace("properties/", "") || "",
        displayName: prop.displayName || "Unnamed",
        parent: account.displayName || "Unknown Account",
      });
    }
  }
  return properties;
}

export default function StreamsPage() {
  const { user, gaAccessToken } = useAuth();
  const [streams, setStreams] = useState<GAStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // GA properties from API
  const [gaProperties, setGaProperties] = useState<GAProperty[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [propertySearch, setPropertySearch] = useState("");
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set());

  const load = async () => {
    if (!user) return;
    const s = await getStreams(user.uid);
    setStreams(s);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user]);

  const loadProperties = async () => {
    if (!gaAccessToken) return;
    setLoadingProperties(true);
    try {
      const data = await fetchAccountSummaries(gaAccessToken);
      setGaProperties(parseProperties(data));
    } catch {
      // If token expired, properties will be empty
    }
    setLoadingProperties(false);
  };

  const openModal = () => {
    setShowModal(true);
    setSelectedProperties(new Set());
    setPropertySearch("");
    loadProperties();
  };

  const togglePropertySelection = (propertyId: string) => {
    setSelectedProperties((prev) => {
      const next = new Set(prev);
      if (next.has(propertyId)) next.delete(propertyId);
      else next.add(propertyId);
      return next;
    });
  };

  const handleAddSelected = async () => {
    if (!user || selectedProperties.size === 0) return;
    setSaving(true);

    const existingIds = new Set(streams.map((s) => s.propertyId));

    for (const propId of selectedProperties) {
      if (existingIds.has(propId)) continue;
      const prop = gaProperties.find((p) => p.propertyId === propId);
      if (!prop) continue;
      await addStream({
        userId: user.uid,
        propertyId: prop.propertyId,
        streamName: prop.displayName,
        websiteUrl: "",
        active: true,
        createdAt: Date.now(),
      });
    }

    setShowModal(false);
    setSaving(false);
    setSelectedProperties(new Set());
    load();
  };

  const handleToggle = async (stream: GAStream) => {
    if (!stream.id) return;
    await updateStream(stream.id, { active: !stream.active });
    load();
  };

  const handleDelete = async (id: string) => {
    await deleteStream(id);
    setMenuOpen(null);
    load();
  };

  const filtered = streams.filter(
    (s) =>
      s.streamName.toLowerCase().includes(search.toLowerCase()) ||
      s.propertyId.includes(search)
  );

  const existingIds = new Set(streams.map((s) => s.propertyId));

  const filteredProperties = gaProperties.filter(
    (p) =>
      p.displayName.toLowerCase().includes(propertySearch.toLowerCase()) ||
      p.propertyId.includes(propertySearch) ||
      p.parent.toLowerCase().includes(propertySearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-text-primary">My Streams</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search streams..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-border bg-bg-card py-1.5 pl-9 pr-3 text-sm text-text-primary outline-none placeholder:text-text-muted"
            />
          </div>
          <button
            onClick={openModal}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Stream
          </button>
        </div>
      </div>

      {/* Stream cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-text-muted mb-2">
            {streams.length === 0 ? "No streams added yet" : "No streams match your search"}
          </p>
          {streams.length === 0 && (
            <button
              onClick={openModal}
              className="text-sm text-accent hover:underline"
            >
              Add your first stream
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((stream) => (
            <div
              key={stream.id}
              className={`relative rounded-xl border border-border bg-bg-card p-4 backdrop-blur-sm transition-opacity ${
                !stream.active ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-text-primary truncate">
                    {stream.streamName}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">GA4 - {stream.propertyId}</p>
                  {stream.websiteUrl && (
                    <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      {stream.websiteUrl}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(stream)}
                    className={`relative h-5 w-9 rounded-full transition-colors ${
                      stream.active ? "bg-accent" : "bg-text-muted/30"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform shadow-sm ${
                        stream.active ? "left-[18px]" : "left-0.5"
                      }`}
                    />
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === stream.id ? null : stream.id!)}
                      className="rounded-lg p-1 text-text-muted hover:bg-accent-light"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {menuOpen === stream.id && (
                      <div className="absolute right-0 top-8 z-10 w-32 rounded-lg border border-border bg-bg-card py-1 shadow-lg">
                        <button
                          onClick={() => handleDelete(stream.id!)}
                          className="w-full px-3 py-1.5 text-left text-sm text-danger hover:bg-accent-light"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    stream.active ? "bg-success" : "bg-text-muted"
                  }`}
                />
                <span className="text-xs text-text-secondary">
                  {stream.active ? "Active" : "Paused"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Stream Modal - Property Picker */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-bg-card p-6 shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">Add GA Streams</h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-text-muted hover:bg-accent-light"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-text-muted mb-4">
              Select the properties you want to monitor. Already added properties are marked.
            </p>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search properties..."
                value={propertySearch}
                onChange={(e) => setPropertySearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg-secondary py-2 pl-9 pr-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent"
              />
            </div>

            {/* Property list */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {loadingProperties ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                  <span className="ml-2 text-sm text-text-muted">Loading your GA properties...</span>
                </div>
              ) : gaProperties.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-text-muted mb-2">No GA4 properties found</p>
                  <p className="text-xs text-text-muted">
                    Make sure your Google account has access to GA4 properties
                  </p>
                  <button
                    onClick={loadProperties}
                    className="mt-3 flex items-center gap-1.5 mx-auto text-xs text-accent hover:underline"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Retry
                  </button>
                </div>
              ) : filteredProperties.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-8">No properties match your search</p>
              ) : (
                filteredProperties.map((prop) => {
                  const alreadyAdded = existingIds.has(prop.propertyId);
                  const isSelected = selectedProperties.has(prop.propertyId);

                  return (
                    <button
                      key={prop.propertyId}
                      onClick={() => !alreadyAdded && togglePropertySelection(prop.propertyId)}
                      disabled={alreadyAdded}
                      className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                        alreadyAdded
                          ? "border-border/50 opacity-50 cursor-not-allowed"
                          : isSelected
                          ? "border-accent bg-accent-light"
                          : "border-border hover:border-accent/50 hover:bg-accent-light/50"
                      }`}
                    >
                      {/* Checkbox */}
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                          alreadyAdded
                            ? "border-text-muted/30 bg-text-muted/10"
                            : isSelected
                            ? "border-accent bg-accent"
                            : "border-border"
                        }`}
                      >
                        {(alreadyAdded || isSelected) && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {prop.displayName}
                        </p>
                        <p className="text-xs text-text-muted">
                          {prop.parent} - GA4-{prop.propertyId}
                        </p>
                      </div>

                      {alreadyAdded && (
                        <span className="shrink-0 text-[10px] font-medium text-text-muted bg-bg-secondary px-2 py-0.5 rounded-full">
                          Added
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="text-xs text-text-muted">
                {selectedProperties.size > 0
                  ? `${selectedProperties.size} selected`
                  : `${gaProperties.length} properties found`}
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-accent-light transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSelected}
                  disabled={saving || selectedProperties.size === 0}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  {saving
                    ? "Adding..."
                    : `Add ${selectedProperties.size || ""} Stream${selectedProperties.size !== 1 ? "s" : ""}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
