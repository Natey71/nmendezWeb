# Grid Tycoon — Mini Power Manager

Welcome to **Power Grid Tycoon**, a miniature power‑system simulator that puts you in
charge of a small electric utility.  Your goal is to balance the needs of your
customers with the capabilities of your generators while keeping the grid
frequency steady near 60 Hz.  To succeed you’ll need to build and manage
generation assets, schedule energy storage, sign customer contracts and respond
to daily and seasonal changes in demand — all while watching your cash and
reputation.

## Overview

The game opens with a brief message and a control panel.  The header reads
**“Grid Tycoon — Mini Power Manager”** with a subtitle inviting you to
*balance supply and demand to hold frequency near 60 Hz while growing your
grid*.  An adaptive reserve margin accounts for how much capacity is online and
how quickly things can ramp, so oversupply and undersupply will affect the
system differently.  You’ll start with a few generation units and a
handful of customer contracts; from there it’s up to you to expand and operate
your grid.

The main screen is split into several panels:

- **Season and KPI panel** – shows the current season, day and time, along with
  average demand, supply and income.  A set of live key performance
  indicators (KPIs) displays real‑time values for demand, supply, supply‑demand
  balance, grid frequency, spot price, cash, reputation and uptime.
- **Status panel** – visualises demand and supply with animated bars, a dial
  illustrating how far the frequency is from 60 Hz and a line chart of recent
  grid stability.  A battery panel monitors the state of charge of your
  storage units and a short help message reminds you that keeping the balance
  within ±5 MW yields the best revenue and reputation.
- **Operations panel** – split into two columns.  The left column lists
  generators and allows you to toggle individual units on or off.  The right
  column lists customers and lets you connect or disconnect businesses.  At the
  top of the operations panel are buttons to open dialogs for building new
  generation, reviewing contract offers and purchasing upgrades.
- **Notification log** – records significant events such as overload warnings,
  contract offers, completed builds and upgrades.  This helps you keep track
  of what’s happening as the simulation runs.

Controls along the top allow you to **start**, **pause** or **reset** the
simulation, adjust the **difficulty** (easy/normal/hard) and **speed** (1×–4×)
of the simulation, open **daily** or **seasonal** reports and view the
**leaderboard**.  A “How to Play” button opens a short primer (summarised
below) and there is an optional form at the end of a game to save your score
to the global leaderboard.

## How the Game Works

Each second of real time corresponds to a slice of an in‑game day.  Demand
evolves over the course of the day and varies by customer type.  For example,
residential blocks consume more electricity in the evenings, stores and offices
follow business‑hour patterns, and datacentres draw a steady load.  New
customer contracts appear as **offers** that you may accept or decline.  When
accepted, a contract adds a fixed megawatt (MW) commitment that follows a
particular daily profile and pays you according to the agreed rate.  You can
disconnect individual customers at any time if the grid is strained or to save
on operating costs.

On the supply side you manage a fleet of generators and batteries.  Each
generator has a name, fuel type, maximum capacity, start‑up time and operating
expense.  **Coal units** provide steady base‑load power but take longer to
start and incur higher emissions and running costs.  **Gas turbines** offer
flexibility and fast start‑up times, making them ideal for covering demand
spikes.  **Wind farms** and **solar PV** produce electricity without fuel
costs but their output varies with weather and time of day.  **Battery
storage** acts as both a source and a sink: it discharges during periods of
undersupply and charges during periods of oversupply.  Batteries have a
maximum power rating and energy capacity, and they automatically charge or
discharge when enabled.

In your starting fleet you will have a large coal unit, several gas turbines,
small wind and solar plants and a battery.  As you progress you can build
additional assets via the **Build** dialog.  The game offers blueprints for
new coal, gas, wind, solar and battery units, and eventually a high‑capacity
nuclear unit.  Each blueprint lists the unit’s capacity, start‑up time,
operating expense, emissions, build time and capital cost.  Some advanced
options (such as nuclear) are locked until your profits reach a certain
threshold.

### Balancing Supply and Demand

The heart of Power Grid Tycoon is the balance between supply and demand.  The
simulator tracks megawatts generated and consumed at each tick and calculates
the resulting frequency.  When supply and demand match, the grid remains
stable at 60 Hz.  If demand exceeds supply the frequency drops; if supply
exceeds demand it rises.  Staying within a **safe band** around 60 Hz is
critical for reliability.  A **reserve margin** — extra headroom from online
capacity — determines how tolerant the system is to deviations.  Minor
imbalances are tolerated, but large shortfalls or surpluses trigger an
**overload warning**.

When an overload occurs the simulation enters a 45‑second grace period.  A
banner and red pill display a countdown and a reason for the overload (for
example, insufficient reserve or unsafe frequency).  You have that time to
bring the grid back into balance by toggling units, building new capacity,
disconnecting customers or using stored energy.  If the issue isn’t resolved
within the window the game ends.

### Contracts, Upgrades and Growth

To grow your utility you must continually sign new customer contracts and build
additional generation.  Contracts arrive periodically and specify how much
power the customer will use and the rate you will be paid.  Accepting a
contract increases your revenue potential but also raises your demand
commitment; declining it might protect your reserve margin.  Customers are
grouped as homes, stores, offices, factories and datacentres, each with
distinct demand patterns.

Upgrades provide quality‑of‑life improvements.  Examples include:

- **Auto‑Dispatch (AGC)** – Automatically toggles one of your gas turbines to
  help hold the balance within ±5 MW.
- **Forecast HUD** – Reveals forecasts for the next hour of demand and
  renewable output, giving you time to plan.
- **Marketing** – Increases your reputation cap and boosts the rate at which
  contract offers arrive.

Upgrades cost money, so timing them correctly is part of the strategy.  You
unlock higher‑tier blueprints and upgrades as your profits grow.

### Reports and Leaderboards

Every in‑game day and season you can view summary reports via the **Daily
Reports** and **Season Reports** buttons.  These reports show aggregated
metrics such as total energy delivered, average price, revenues, emissions and
uptime, along with a log of notable events.  Completing an entire season
generates a season summary and resets the day counter while advancing the
season (spring, summer, fall or winter).  The simulation keeps track of your
cumulative performance across seasons.

If you reach a game over condition you’ll receive a **scorecard** and the
option to save your score to the global leaderboard.  Scores are based on a
combination of profit, reliability, clean energy penetration and other
factors.  Entering a name is optional, but uploading your score lets you see
how you compare to other players.

## Tips for New Operators

- **Use fast‑responding assets for balancing.**  Gas turbines and batteries
  respond quickly to sudden changes in demand; use them to fill short‑term
  gaps while slower units come online.
- **Reserve base‑load units for the long haul.**  Coal and, later, nuclear
  units are best used to cover steady demand because they take longer to start
  and stop.
- **Ride your renewables.**  Wind and solar have no fuel cost; prioritise
  their output when available, but keep backup generation ready for calm or
  cloudy periods.
- **Watch your battery state of charge.**  Batteries can absorb excess
  generation and supply power during spikes, but once empty they need time to
  recharge.
- **Accept contracts judiciously.**  More customers mean more income, but they
  also require you to maintain greater reserve headroom.  Decline offers if
  you’re nearing your capacity limits.

## Conclusion

Power Grid Tycoon blends strategy and simulation to teach core concepts of
electric‑power operation.  It emphasises balancing supply and demand,
maintaining grid frequency, investing in generation and storage, and managing
customer growth — all while keeping an eye on profits and reputation.  The
adaptive difficulty settings make it approachable for newcomers and
challenging for experienced players.  We hope you enjoy managing your mini
grid and experimenting with different strategies to achieve a reliable and
profitable power system.
