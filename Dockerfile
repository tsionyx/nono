FROM ubuntu

# replace default shell
# https://stackoverflow.com/a/25423366
SHELL ["/bin/bash", "-c"]

RUN apt-get update
RUN apt-get install build-essential curl git cmake python python3 node-typescript -y

# add a user rust
RUN useradd -ms /bin/bash rust
USER rust
ENV HOME /home/rust
ENV USER rust
ENV SHELL /bin/bash
WORKDIR /home/rust

# download rust and wasm-pack
RUN curl -sSLf sh.rustup.rs | sh -s -- -y
RUN echo "export PATH=~/.cargo/bin:$PATH" >> ~/.bashrc
RUN echo "export PS1='\u:\w$ '" >> ~/.bashrc
RUN source ~/.cargo/env && curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh -s -- -f

# build wasm-opt tool
RUN git clone https://github.com/WebAssembly/binaryen.git
WORKDIR binaryen
RUN cmake . && make
WORKDIR ..

## download project
RUN mkdir nono
WORKDIR nono
ADD src ./src
ADD tests ./tests
ADD www ./www
ADD Cargo.* ./

# build
RUN source ~/.cargo/env && wasm-pack build --target no-modules --no-typescript

# optimize
RUN ../binaryen/bin/wasm-opt pkg/nono_bg.wasm -O3 -o pkg/nono_bg.wasm

# start a web server
RUN cp www/*.html www/{index,worker}.js pkg/
WORKDIR pkg
EXPOSE 8000
CMD ["python3", "-mhttp.server"]
