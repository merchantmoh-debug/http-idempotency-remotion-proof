import React from 'react';
import {registerRoot, Composition} from 'remotion';
import {Proof} from './Proof';
const Root: React.FC = () => <Composition id="RetryProof" component={Proof} durationInFrames={1800} fps={30} width={1920} height={1080} defaultProps={{audit: false}}/>;
registerRoot(Root);
