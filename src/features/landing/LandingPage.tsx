import { ArrowForward, AutoAwesome, CheckCircle, Insights, ViewQuilt } from '@mui/icons-material'
import { Box, Button, Container, Divider, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'

const highlights = [
  { icon: <ViewQuilt />, title: 'A resume that feels like you', body: 'Build with polished layouts, then tune the details without fighting a template.' },
  { icon: <Insights />, title: 'Feedback you can act on', body: 'See what matches a job description, what is missing, and why it matters.' },
  { icon: <CheckCircle />, title: 'Private by default', body: 'Your resumes stay in this browser. No account or upload required.' },
]

export function LandingPage() {
  return (
    <Box className="landing-page">
      <Container maxWidth="xl">
        <Box component="header" className="landing-nav">
          <Button component={RouterLink} to="/" className="landing-brand" startIcon={<AutoAwesome />}>Forma<span>CV</span></Button>
          <Stack direction="row" spacing={1}>
            <Button component={RouterLink} to="/ats" color="inherit">ATS checker</Button>
            <Button component={RouterLink} to="/dashboard" variant="contained" color="primary" endIcon={<ArrowForward />}>Open workspace</Button>
          </Stack>
        </Box>
        <Box className="landing-hero">
          <Box className="hero-copy">
            <Typography className="eyebrow"><span /> RESUMES, MADE INTENTIONAL</Typography>
            <Typography component="h1">Your next chapter<br />starts on <em>one page.</em></Typography>
            <Typography className="hero-description">Build a clear, confident resume. Tune it for the role. Keep every draft right here with you.</Typography>
            <Stack className="hero-actions" direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button component={RouterLink} to="/dashboard" variant="contained" color="secondary" endIcon={<ArrowForward />}>Create resume</Button>
              <Button component={RouterLink} to="/ats" variant="outlined" color="primary" startIcon={<Insights />}>Check ATS score</Button>
            </Stack>
            <Typography className="privacy-note">No account needed · Saved locally on your device</Typography>
          </Box>
          <Box className="hero-art" aria-label="Resume document preview">
            <div className="art-index">01 / YOUR STORY</div>
            <div className="resume-sheet">
              <div className="sheet-topline"><span>CURRICULUM VITAE</span><span>2026</span></div>
              <div className="sheet-accent" />
              <div className="sheet-name">Alex Morgan</div>
              <div className="sheet-role">PRODUCT DESIGNER · NEW YORK</div>
              <div className="sheet-contact">alex.morgan@email.com&nbsp;&nbsp; / &nbsp;&nbsp;alexmorgan.design</div>
              <div className="sheet-section-title">PROFILE</div>
              <div className="sheet-line wide" /><div className="sheet-line wide" /><div className="sheet-line mid" />
              <div className="sheet-section-title">EXPERIENCE</div>
              <div className="sheet-job"><b>Senior Product Designer</b><span>2022 — NOW</span></div>
              <div className="sheet-line wide" /><div className="sheet-line mid" />
              <div className="sheet-job"><b>Product Designer</b><span>2019 — 2022</span></div>
              <div className="sheet-line wide" /><div className="sheet-line short" />
              <div className="sheet-section-title">SELECTED SKILLS</div>
              <div className="sheet-skills"><i>Research</i><i>Prototyping</i><i>Figma</i><i>Systems</i></div>
            </div>
            <div className="art-stamp">READY<br />FOR WHAT'S NEXT</div>
          </Box>
        </Box>
        <Divider />
        <Box className="landing-features">
          <Box className="feature-intro"><Typography className="eyebrow">THE GOOD WORK, IN ONE PLACE</Typography><Typography variant="h2">Made for the whole process.</Typography></Box>
          <Box className="feature-grid">
            {highlights.map((item, index) => (
              <Box className="feature-item" key={item.title}>
                <Box className="feature-icon">{item.icon}</Box>
                <Typography className="feature-number">0{index + 1}</Typography>
                <Typography variant="h3">{item.title}</Typography>
                <Typography color="text.secondary">{item.body}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  )
}