import { useEffect, useState } from "react";

function App() {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // Parse /preview/{folder}/{ComponentName} or /preview/{ComponentName}
    const path = window.location.pathname.replace(/^\/__mockup/, "");

    if (!path.startsWith("/preview/")) {
      // Index: show list of available components
      setNotFound(false);
      return;
    }

    const key = path.replace("/preview/", "");

    import("./.generated/mockup-components")
      .then((mod) => {
        const comp = mod.mockupComponents[key];
        if (comp) {
          setComponent(() => comp);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true));
  }, []);

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Component Not Found</h1>
          <p className="text-gray-500">
            Check that the component file exists and is exported correctly.
          </p>
        </div>
      </div>
    );
  }

  if (Component) {
    return <Component />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Mockup Sandbox</h1>
      <p className="text-gray-500">
        Navigate to <code className="bg-gray-100 px-1 rounded">/preview/&#123;folder&#125;/&#123;ComponentName&#125;</code> to view a component.
      </p>
    </div>
  );
}

export default App;
