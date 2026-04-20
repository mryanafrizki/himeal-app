export default function Loading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0C1410",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
      }}
    >
      <div
        style={{
          fontSize: "2rem",
          fontWeight: 900,
          color: "#5BDB6F",
          fontFamily: "'Manrope', sans-serif",
          letterSpacing: "-0.04em",
          textTransform: "uppercase",
        }}
      >
        HI MEAL!
      </div>
      <div
        style={{
          fontSize: "0.625rem",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "#8FA89A",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        Good food, good mood
      </div>
      <div
        style={{
          marginTop: "1.5rem",
          width: "2rem",
          height: "2rem",
          border: "3px solid #2E4A38",
          borderTopColor: "#5BDB6F",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
    </div>
  );
}
