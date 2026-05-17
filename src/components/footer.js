const goToReact = () => {
  window.open('https://reactjs.org', '_blank');
};

const goToRepo = () => {
  window.open('https://github.com/chickengamer555/chicken-spotify-explore', '_blank');
};

const Footer = ({ logged, onLogout }) => {
  return (
    <footer>
      {logged ? (
        <div className="logout">
          <button onClick={onLogout}>&gt; log out</button>
        </div>
      ) : (
        <div className="logout"></div>
      )}
      <div className="github">
        <button onClick={goToRepo}></button>
      </div>
      <div className="info">
        <div className="react">
          made with <h3 onClick={goToReact}>React</h3>.. and some <h2>☕</h2>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
