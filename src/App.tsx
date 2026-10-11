import {
  AutoAwesome,
  Dashboard,
  Description,
  Insights,
  Menu,
} from "@mui/icons-material";
import {
  AppBar,
  Box,
  Button,
  Container,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  createTheme,
} from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { lazy, Suspense, useState } from "react";
import {
  Link as RouterLink,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import "./product.css";

const AtsPage = lazy(() =>
  import("./features/ats-checker/AtsPage").then((module) => ({
    default: module.AtsPage,
  })),
);
const DashboardPage = lazy(() =>
  import("./features/dashboard/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);
const LandingPage = lazy(() =>
  import("./features/landing/LandingPage").then((module) => ({
    default: module.LandingPage,
  })),
);
const EditorPage = lazy(() =>
  import("./features/resume-editor/EditorPage").then((module) => ({
    default: module.EditorPage,
  })),
);

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#203b37", contrastText: "#fffdf7" },
    secondary: { main: "#d1f15b", contrastText: "#182c28" },
    background: { default: "#f5f6f1", paper: "#ffffff" },
    text: { primary: "#172a27", secondary: "#66736e" },
    divider: "#e2e7df",
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"DM Sans", "Segoe UI", sans-serif',
    h1: { fontFamily: '"Manrope", "DM Sans", sans-serif', fontWeight: 700 },
    h2: { fontFamily: '"Manrope", "DM Sans", sans-serif', fontWeight: 700 },
    h3: { fontFamily: '"Manrope", "DM Sans", sans-serif', fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 700 },
  },
  components: {
    MuiButton: { styleOverrides: { root: { borderRadius: 6, minHeight: 42 } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
  },
});

function ProductShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);
  const links = [
    { label: "My resumes", to: "/dashboard", icon: <Dashboard /> },
    { label: "ATS checker", to: "/ats", icon: <Insights /> },
  ];

  return (
    <Box className="product-shell">
      <AppBar className="topbar" position="sticky" elevation={0}>
        <Toolbar className="topbar-inner">
          <IconButton
            className="mobile-menu"
            aria-label="Open navigation"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu />
          </IconButton>
          <Button
            className="brand"
            component={RouterLink}
            to="/dashboard"
            color="inherit"
            startIcon={<AutoAwesome />}
          >
            Forma<span>CV</span>
          </Button>
          <Box className="topbar-links">
            {links.map((item) => (
              <Button
                key={item.to}
                component={RouterLink}
                to={item.to}
                color="inherit"
                startIcon={item.icon}
              >
                {item.label}
              </Button>
            ))}
          </Box>
          <Button
            className="topbar-create"
            component={RouterLink}
            to="/dashboard"
            variant="contained"
            color="secondary"
            startIcon={<Description />}
          >
            New resume
          </Button>
        </Toolbar>
      </AppBar>
      <Drawer open={drawerOpen} onClose={closeDrawer}>
        <Box
          sx={{ width: 280, pt: 2 }}
          role="presentation"
          onClick={closeDrawer}
        >
          <List>
            {links.map((item) => (
              <ListItemButton key={item.to} component={RouterLink} to={item.to}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>
      <Outlet />
      <Box component="footer" className="app-footer">
        <Container maxWidth="xl">
          <Typography variant="caption">
            FormaCV · Your documents stay on this device.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Suspense
        fallback={
          <Box className="loading-state">
            <Typography color="text.secondary">
              Opening your workspace...
            </Typography>
          </Box>
        }
      >
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route element={<ProductShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/resume/:resumeId" element={<EditorPage />} />
            <Route path="/ats" element={<AtsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </ThemeProvider>
  );
}

export default App;
